'use client';
import { useEffect } from 'react';

// On narrow screens the Wix boxes keep their desktop geometry, so text can sit
// on (or past) the edge of its colored background. Mark only those colored
// boxes whose text is too close to the edge; CSS then adds inner padding.
const BOX = '.FDI5TK, .gpDCD5, .wixui-column-strip__column';
const clear = (color) => !color || color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

function boxColor(box) {
  const layer = box.querySelector(':scope > [id^="bgLayers"] [data-testid="colorUnderlay"], :scope > .jv9xi4');
  const own = getComputedStyle(box).backgroundColor;
  if (!clear(own)) return own;
  return layer ? getComputedStyle(layer).backgroundColor : '';
}

function isTight(box) {
  const b = box.getBoundingClientRect();
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent.trim()) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (!r.width) continue;
      if (r.left - b.left < 8 || b.right - r.right < 8 || r.bottom > b.bottom - 2 || r.top < b.top + 2) return true;
    }
  }
  return false;
}

export default function BoxFit() {
  useEffect(() => {
    const run = () => {
      document.querySelectorAll('[data-km-boxfit]').forEach((el) => el.removeAttribute('data-km-boxfit'));
      if (window.innerWidth > 1000) return;
      const root = document.querySelector('.km-responsive');
      if (!root) return;
      for (const box of root.querySelectorAll(BOX)) {
        if (!visible(box)) continue;
        // Leaf boxes only: nested visible boxes are handled on their own.
        if ([...box.querySelectorAll(BOX)].some(visible)) continue;
        if (clear(boxColor(box))) continue;
        if (box.getBoundingClientRect().width >= window.innerWidth - 2) continue;
        if (isTight(box)) box.setAttribute('data-km-boxfit', '');
      }
    };
    run();
    const fonts = document.fonts?.ready?.then(run);
    let timer;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(run, 150); };
    window.addEventListener('resize', onResize);
    window.addEventListener('load', run);
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('load', run); clearTimeout(timer); void fonts; };
  }, []);
  return null;
}
