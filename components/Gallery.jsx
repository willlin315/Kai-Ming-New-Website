'use client';
import { useEffect, useState } from 'react';

export default function Gallery({ items, id, className }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (paused || reducedMotion || items.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 3000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, items.length]);
  if (!items.length) return null;
  return (
    <div id={id} className={`${className || ''} km-gallery`} role="region" aria-roledescription="carousel" aria-label="Photo gallery"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}>
      <img src={items[index].src} alt={items[index].alt} className="km-gallery-photo" />
      {items.length > 1 && <div className="km-gallery-controls">
        <button type="button" aria-label="Previous photo" onClick={() => setIndex((index + items.length - 1) % items.length)}>‹</button>
        <span aria-live={paused ? 'polite' : 'off'}>{index + 1} / {items.length}</span>
        <button type="button" aria-label="Next photo" onClick={() => setIndex((index + 1) % items.length)}>›</button>
        <button type="button" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'} onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>
      </div>}
    </div>
  );
}
