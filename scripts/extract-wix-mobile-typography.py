#!/usr/bin/env python3
"""Copy Wix mobile typography into phone-only CSS rules.

Wix serves phones a separate mobile layout with per-element font sizes. That
layout is 320px wide and the browser zooms it to the screen width, so a 16px
Wix font shows as 19.5px on a 390px phone.

This script opens every page on the Wix site with an iPhone profile and on a
local build at the same 320px width, matches text elements by component id,
tag and text, and writes rules to content/mobile-typography.json. Sizes are
written as clamp(px, vw, px) so text scales with the screen like Wix does
while the site keeps a normal device-width viewport. The upper bound stops
growth at a 430px-wide phone, so landscape phones and small tablets stay readable.

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
    const text = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\\u200b/g, '').replace(/\\s+/g, ' ').trim();
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
DESIGN_WIDTH = 320  # Wix mobile layout width
MAX_WIDTH = 430     # stop scaling at the widest common phone
SCALED = ('fontSize', 'lineHeight', 'letterSpacing')
PX = re.compile(r'^(-?\d+(?:\.\d+)?)px$')


def fluid(value):
    """Turn a Wix mobile px value into a size that scales with the screen width."""
    m = PX.match(value)
    if not m or float(m.group(1)) == 0:
        return value
    n = float(m.group(1))
    lo, hi = sorted((n, n * MAX_WIDTH / DESIGN_WIDTH))
    vw = n * 100 / DESIGN_WIDTH
    return f'clamp({lo:g}px,{vw:.4g}vw,{hi:.4g}px)'


def main():
    routes = json.loads((ROOT / 'content/routes.json').read_text())
    result, stats = {}, []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        phone = pw.devices['iPhone 13']
        wix_page = browser.new_context(**phone).new_page()
        # Our site at Wix's 320px design width, so values compare one to one.
        our_page = browser.new_context(**{**phone, 'viewport': {'width': DESIGN_WIDTH, 'height': 693}}).new_page()
        for route in routes:
            key = route['key']
            wix_slug = '' if key == 'home' else '/' + key
            ours_slug = '' if key == 'home' else '/' + route.get('slug', key)
            for locale, prefix in LOCALES.items():
                wix_items = collect(wix_page, f'{WIX}{prefix}{wix_slug}')
                our_items = collect(our_page, f'{LOCAL}/{locale}{ours_slug}/')
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
                # Wix sometimes wraps text in an extra span or turns part of a sentence
                # into a link, so also accept the same text in another tag, or text that
                # starts the same way.
                for o_item in our_items:
                    if o_item['path'] in matched:
                        continue
                    for w_item in wix_items:
                        if w_item['comp'] == o_item['comp'] and (w_item['text'] == o_item['text'] or (len(o_item['text']) >= 20 and w_item['text'][:20] == o_item['text'][:20])):
                            pairs.append((w_item, o_item))
                            matched.add(o_item['path'])
                            break
                rules = result.setdefault(key, {}).setdefault(locale, {})
                changed = 0
                for w_item, o_item in pairs:
                    w, o = w_item['style'], o_item['style']
                    decl = {p: w[p] for p in PROPS if w[p] != o[p] and p not in SCALED}
                    # Sizes are always set so they scale with the screen, even when equal at 320px.
                    decl.update({p: w[p] for p in SCALED if PX.match(w[p]) and w[p] != '0px'})
                    if w['lineHeight'] == 'normal' and o['lineHeight'] != 'normal':
                        decl['lineHeight'] = 'normal'
                    if decl:
                        rules.setdefault(o_item['path'], {}).update(decl)
                        changed += 1
                # Wix zooms its whole mobile page, so text we could not match still has to
                # scale with the screen: keep its own 320px size and make it fluid.
                for o_item in our_items:
                    english = result[key].get('en', {}) if locale != 'en' else {}
                    if o_item['path'] in matched or o_item['path'] in rules or o_item['path'] in english:
                        continue
                    decl = {p: o_item['style'][p] for p in SCALED if PX.match(o_item['style'][p]) and o_item['style'][p] != '0px'}
                    if decl:
                        rules[o_item['path']] = decl
                stats.append((key, locale, len(wix), len(ours), len(pairs), changed))
                print(*stats[-1], flush=True)
        browser.close()
    css = {}
    declare = lambda decl: ';'.join(f'{CSS_NAMES[p]}:{fluid(v) if p in SCALED else v}!important' for p, v in decl.items())
    for key, by_locale in result.items():
        # English rules apply to every language, because translated text is often split
        # into different paragraphs and cannot be matched. Language rules only add what differs.
        base = by_locale.get('en', {})
        lines = [f'.km-responsive {selector}{{{declare(decl)}}}' for selector, decl in sorted(base.items())]
        for locale, rules in by_locale.items():
            if locale == 'en':
                continue
            lang = 'zh-HK' if locale == 'zh' else locale
            for selector, decl in sorted(rules.items()):
                extra = {p: v for p, v in decl.items() if base.get(selector, {}).get(p) != v}
                if extra:
                    lines.append(f'.km-responsive[lang="{lang}"] {selector}{{{declare(extra)}}}')
        if lines:
            css[key] = '/* Generated by scripts/extract-wix-mobile-typography.py from the Wix mobile site. */\n@media (max-width:750px){\n' + '\n'.join(lines) + '\n}'
    OUTPUT.write_text(json.dumps(css, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
