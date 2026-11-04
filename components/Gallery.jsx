'use client';
import { useEffect, useState } from 'react';

// Photo slideshow (center pages, Family Support). Photos sit side by side on a track that slides:
// "next" (and autoplay) moves the track right-to-left, "previous" left-to-right. A copy of the last photo
// before the first and of the first photo after the last lets the loop keep sliding the same way; when the
// track lands on a copy it jumps, without animation, to the real photo. With "reduce motion" on, photos
// change instantly and autoplay stays off.
const SLIDE_MS = 600;

export default function Gallery({ items, id, className }) {
  const count = items.length;
  const [pos, setPos] = useState(1); // track position: 0 = copy of last, 1..count = photos, count + 1 = copy of first
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const index = ((pos - 1) % count + count) % count;
  const go = (step) => { setAnimate(!reducedMotion); setPos((p) => {
    if (p < 1 || p > count) return p; // still settling on a copy
    const next = p + step;
    return reducedMotion ? ((next - 1 + count) % count) + 1 : next;
  }); };
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = window.setInterval(() => go(1), 3000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, count]);
  // Landed on a copy: jump to the matching real photo without animating.
  useEffect(() => {
    if (pos !== 0 && pos !== count + 1) return;
    const timer = window.setTimeout(() => { setAnimate(false); setPos(pos === 0 ? count : 1); }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [pos, count]);
  if (!count) return null;
  const slides = count > 1 ? [items[count - 1], ...items, items[0]] : items;
  const offset = count > 1 ? pos : 0;
  return (
    <div id={id} className={`${className || ''} km-gallery`} role="region" aria-roledescription="carousel" aria-label="Photo gallery"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}>
      <div className="km-gallery-track" style={{ transform: `translateX(-${offset * 100}%)`, transition: animate ? `transform ${SLIDE_MS}ms ease` : 'none' }}>
        {slides.map((item, i) => {
          const copy = count > 1 && (i === 0 || i === count + 1);
          return <img key={i} src={item.src} alt={copy ? '' : item.alt}
            aria-hidden={i !== offset || undefined} className="km-gallery-photo" draggable={false} />;
        })}
      </div>
      {count > 1 && <div className="km-gallery-controls">
        <button type="button" aria-label="Previous photo" onClick={() => go(-1)}>‹</button>
        <span aria-live={paused ? 'polite' : 'off'}>{index + 1} / {count}</span>
        <button type="button" aria-label="Next photo" onClick={() => go(1)}>›</button>
        <button type="button" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>
      </div>}
    </div>
  );
}
