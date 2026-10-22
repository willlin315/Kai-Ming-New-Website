#!/usr/bin/env python3
"""Copy Wix mobile typography into phone-only CSS rules.

Wix serves phones a separate mobile layout with per-element font sizes.
This script opens every page on the Wix site and on a local build with an
iPhone profile, matches text elements by component id, tag and text, and
writes the differing font properties to content/mobile-typography.json.

Run it against a local build, rebuild, then run it again: the second pass
merges into the existing rules and catches values that only change once the
first rules apply (for example inherited line heights).

Usage: python3 scripts/extract-wix-mobile-typography.py [local_base_url]
"""
import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WIX = 'https://willlin3.wixsite.com/kai-ming-head-start'
LOCAL = (sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3100').rstrip('/')
LOCALES = {'en': '', 'zh': '/zh-hk', 'es': '/es'}
PROPS = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color']
CSS_NAMES = {'fontFamily': 'font-family', 'fontSize': 'font-size', 'fontWeight': 'font-weight',
             'fontStyle': 'font-style', 'lineHeight': 'line-height',
             'letterSpacing': 'letter-spacing', 'color': 'color'}

EXTRACT = """(props) => {
  const out = [];
  const els = document.querySelectorAll('[id^=comp-] :is(h1,h2,h3,h4,h5,h6,p,li,span,a,button,div,label)');
  for (const e of els) {
    const text = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const comp = e.closest('[id^=comp-]');
    const path = [];
    for (let n = e; n && n !== comp; n = n.parentElement) {
      path.unshift(n.tagName.toLowerCase() + ':nth-child(' + ([...n.parentElement.children].indexOf(n) + 1) + ')');
    }
    const s = getComputedStyle(e);
    const style = {};
    for (const p of props) style[p] = s[p];
    out.push({comp: comp.id, tag: e.tagName, text: text.slice(0, 60), path: '#' + CSS.escape(comp.id) + ' > ' + path.join(' > '), style});
  }
  return out;
}"""


def collect(page, url):
    page.goto(url, wait_until='load', timeout=90000)
    page.wait_for_timeout(2000)
    page.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}}")
    page.wait_for_timeout(800)
    return page.evaluate(EXTRACT, PROPS)


def keyed(items, by_text=True):
    seen, out = {}, {}
    for item in items:
        base = (item['comp'], item['tag'], item['text'] if by_text else '')
        n = seen.get(base, 0)
        seen[base] = n + 1
        out[base + (n,)] = item
    return out


OUTPUT = ROOT / 'content/mobile-typography.json'
RULE = re.compile(r'^\.km-responsive\[lang="([^"]+)"\] (.+?)\{(.*)\}$')
CSS_PROPS = {v: k for k, v in CSS_NAMES.items()}


def existing_rules():
    """Read rules from a previous run so later passes only add corrections."""
    result = {}
    if not OUTPUT.exists():
        return result
    for key, css in json.loads(OUTPUT.read_text()).items():
        for line in css.splitlines():
            m = RULE.match(line)
            if not m:
                continue
            locale = 'zh' if m.group(1) == 'zh-HK' else m.group(1)
            decl = dict(d.replace('!important', '').split(':', 1) for d in m.group(3).split(';'))
            result.setdefault(key, {}).setdefault(locale, {})[m.group(2)] = {CSS_PROPS[k]: v for k, v in decl.items()}
    return result


def main():
    routes = json.loads((ROOT / 'content/routes.json').read_text())
    result, stats = existing_rules(), []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(**pw.devices['iPhone 13'])
        page = context.new_page()
        for route in routes:
            key = route['key']
            wix_slug = '' if key == 'home' else '/' + key
            ours_slug = '' if key == 'home' else '/' + route.get('slug', key)
            for locale, prefix in LOCALES.items():
                wix_items = collect(page, f'{WIX}{prefix}{wix_slug}')
                our_items = collect(page, f'{LOCAL}/{locale}{ours_slug}/')
                wix, ours = keyed(wix_items), keyed(our_items)
                pairs = [(wix[k], ours[k]) for k in wix.keys() & ours.keys()]
                # Translations can word things differently from Wix, so fall back to
                # component, tag and position when the component has the same element count.
                matched = {o['path'] for _, o in pairs}
                wix_pos, our_pos = keyed(wix_items, False), keyed(our_items, False)
                for k in wix_pos.keys() & our_pos.keys():
                    comp = k[0]
                    if our_pos[k]['path'] in matched:
                        continue
                    if sum(i['comp'] == comp for i in wix_items) == sum(i['comp'] == comp for i in our_items):
                        pairs.append((wix_pos[k], our_pos[k]))
                        matched.add(our_pos[k]['path'])
                # Wix mobile sometimes wraps part of a sentence in a link, so also
                # accept elements whose text starts the same way.
                for o_item in our_items:
                    if o_item['path'] in matched or len(o_item['text']) < 20:
                        continue
                    for w_item in wix_items:
                        if (w_item['comp'], w_item['tag']) == (o_item['comp'], o_item['tag']) and w_item['text'][:20] == o_item['text'][:20]:
                            pairs.append((w_item, o_item))
                            matched.add(o_item['path'])
                            break
                rules = result.setdefault(key, {}).setdefault(locale, {})
                changed = 0
                for w_item, o_item in pairs:
                    w, o = w_item['style'], o_item['style']
                    decl = {p: w[p] for p in PROPS if w[p] != o[p]}
                    if decl:
                        # Line height often follows font size, so set both together.
                        if 'fontSize' in decl:
                            decl['lineHeight'] = w['lineHeight']
                        rules.setdefault(o_item['path'], {}).update(decl)
                        changed += 1
                stats.append((key, locale, len(wix), len(ours), len(pairs), changed))
                print(*stats[-1], flush=True)
        browser.close()
    css = {}
    for key, by_locale in result.items():
        lines = []
        for locale, rules in by_locale.items():
            lang = 'zh-HK' if locale == 'zh' else locale
            for selector, decl in sorted(rules.items()):
                body = ';'.join(f'{CSS_NAMES[p]}:{v}!important' for p, v in decl.items())
                lines.append(f'.km-responsive[lang="{lang}"] {selector}{{{body}}}')
        if lines:
            css[key] = '/* Generated by scripts/extract-wix-mobile-typography.py from the Wix mobile site. */\n@media (max-width:750px){\n' + '\n'.join(lines) + '\n}'
    OUTPUT.write_text(json.dumps(css, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
