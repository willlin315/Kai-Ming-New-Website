'use client';
import { useEffect } from 'react';

// One vertical rhythm for every page section. The Wix export gives each section its own hand-set top and bottom
// space, so content sat 1px from one edge and 150px from another. After layout this measures where each section's
// visible content (text, photos, buttons, coloured panels and cards) starts and ends, then moves the content and
// resizes the section so that:
//   - content sits SPACE from the top and bottom edge of its section (80px desktop, 64px tablet, 48px phone);
//   - where two sections share a background (no visible edge between them), each gives half, so the gap between
//     the two blocks of content is still SPACE;
//   - a section holding only a title (e.g. "What Your Child Will Experience") sits TITLE_GAP above the content it
//     introduces.
// Heroes (sections with the page's h1) and sections with a background photo or video keep their own layout.
const clear = (color) => !color || color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
const space = () => (window.innerWidth > 1000 ? 80 : window.innerWidth > 750 ? 64 : 48);
const titleGap = () => (window.innerWidth > 1000 ? 32 : 24);
const TEXT = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'LI', 'BLOCKQUOTE', 'LABEL']);
const MEDIA = new Set(['IMG', 'VIDEO', 'IFRAME', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'CANVAS']);

function shown(el) {
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 2 && r.height > 2;
}

function sectionsOf(root) {
  return [...root.querySelectorAll('main section.wixui-section')].filter((s) => !s.parentElement.closest('main section.wixui-section'));
}

// The section's own background colour, or 'page' when it is see-through. Photo/video backgrounds return null.
function background(section, width) {
  const layer = section.querySelector(':scope > [data-hook="bgLayers"]');
  if (layer?.querySelector('img, video, wow-image, [data-testid="bgMedia"] *')) return null;
  const own = layer?.querySelector('[data-testid="colorUnderlay"]');
  if (own && !clear(getComputedStyle(own).backgroundColor)) return getComputedStyle(own).backgroundColor;
  // A full-width band inside the section paints its visible colour.
  const sr = section.getBoundingClientRect();
  for (const band of section.querySelectorAll('[data-hook="bgLayers"] [data-testid="colorUnderlay"]')) {
    const r = band.getBoundingClientRect();
    if (r.width >= width * 0.98 && r.height >= sr.height * 0.9 && !clear(getComputedStyle(band).backgroundColor)) return getComputedStyle(band).backgroundColor;
  }
  return 'page';
}

// The part of an element that can be seen: clipped by any ancestor that hides its overflow (e.g. the map frame
// shifted up under its rounded box).
function seenRect(el, section) {
  const r = el.getBoundingClientRect();
  let top = r.top, bottom = r.bottom;
  for (let a = el.parentElement; a && a !== section; a = a.parentElement) {
    if (getComputedStyle(a).overflowY === 'visible') continue;
    const c = a.getBoundingClientRect();
    top = Math.max(top, c.top); bottom = Math.min(bottom, c.bottom);
  }
  return bottom - top > 2 ? { top, bottom } : null;
}

function measure(section) {
  const sr = section.getBoundingClientRect();
  const full = sr.width * 0.98;
  let top = Infinity, bottom = -Infinity, onlyTitles = true, textLength = 0;
  for (const el of section.querySelectorAll('*')) {
    const layer = el.closest('[data-hook="bgLayers"]');
    if (layer && (layer.parentElement === section || layer.getBoundingClientRect().width >= full)) continue;
    let counts = false;
    if (TEXT.has(el.tagName)) {
      const text = (el.innerText || '').trim();
      if (text) { counts = true; if (!/^H\d$/.test(el.tagName)) { textLength += text.length; } }
    } else if (MEDIA.has(el.tagName) || el.matches('a.wixui-button, [data-testid="linkElement"].wixui-button')) {
      counts = true; onlyTitles = false;
    } else {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < full && (!clear(s.backgroundColor) || s.boxShadow !== 'none')) { counts = true; onlyTitles = false; }
    }
    if (!counts || !shown(el)) continue;
    const r = seenRect(el, section);
    if (!r) continue;
    top = Math.min(top, r.top - sr.top);
    bottom = Math.max(bottom, r.bottom - sr.top);
  }
  if (top === Infinity) return null;
  return { top, bottom, onlyTitles: onlyTitles && textLength <= 160 };
}

export default function SectionRhythm() {
  useEffect(() => {
    const root = document.querySelector('.km-responsive');
    if (!root) return undefined;
    let frame = 0, busy = false;
    const controlled = new Set();

    const reset = () => {
      for (const el of controlled) { el.style.removeProperty('top'); el.style.removeProperty('height'); el.style.removeProperty('min-height'); el.style.removeProperty('position'); }
      controlled.clear();
    };

    const run = () => {
      frame = 0; busy = true;
      reset();
      const width = window.innerWidth, S = space(), T = titleGap();
      const list = sectionsOf(root).filter(shown).map((section) => {
        const bg = background(section, width);
        const wrappers = [...section.children].filter((c) => c.getAttribute('data-hook') !== 'bgLayers' && !c.id?.startsWith('bgLayers'));
        const fixed = !section.id || bg === null || section.querySelector('h1') || wrappers.some((w) => getComputedStyle(w).position === 'absolute' || getComputedStyle(w).position === 'fixed');
        const m = fixed ? null : measure(section);
        return { section, bg, wrappers, m, height: section.getBoundingClientRect().height };
      });
      list.forEach((item, i) => {
        if (!item.m) return;
        const prev = list[i - 1], next = list[i + 1];
        const joined = (a, b) => a && b && a.m && b.m && a.bg !== null && a.bg === b.bg;
        let top = S, bottom = S;
        if (joined(prev, item)) top = prev.m.onlyTitles ? T / 2 : S / 2;
        if (joined(item, next)) bottom = item.m.onlyTitles ? T / 2 : S / 2;
        if (item.m.onlyTitles && !joined(item, next)) bottom = S;
        const shift = Math.round(top - item.m.top);
        const height = Math.round(top + (item.m.bottom - item.m.top) + bottom);
        if (Math.abs(shift) < 1 && Math.abs(height - item.height) < 1) return;
        for (const w of item.wrappers) {
          if (getComputedStyle(w).position === 'static') w.style.setProperty('position', 'relative', 'important');
          w.style.setProperty('top', `${shift}px`, 'important');
          controlled.add(w);
        }
        item.section.style.setProperty('height', `${height}px`, 'important');
        item.section.style.setProperty('min-height', '0px', 'important');
        controlled.add(item.section);
      });
      root.setAttribute('data-km-rhythm', '');
      busy = false;
    };
    const schedule = () => { if (!busy && !frame) frame = requestAnimationFrame(run); };

    schedule();
    document.fonts?.ready.then(schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    const onLoad = (e) => { if (e.target?.tagName === 'IMG' || e.target?.tagName === 'IFRAME') schedule(); };
    root.addEventListener('load', onLoad, true);
    // Content that changes after load (CMS text, form messages, tabs, mobile box padding) re-measures.
    const observer = new MutationObserver(schedule);
    observer.observe(root.querySelector('main') || root, { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['class', 'hidden', 'open', 'aria-expanded', 'aria-selected', 'data-km-boxfit', 'data-state', 'src'] });
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); reset();
      window.removeEventListener('resize', schedule); window.removeEventListener('load', schedule); root.removeEventListener('load', onLoad, true);
    };
  }, []);
  return null;
}
