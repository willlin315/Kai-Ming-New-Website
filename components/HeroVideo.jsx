'use client';
import { useEffect, useRef, useState } from 'react';
import { HomeText } from './HomeContent';

// Home hero: the Kai Ming video, self-hosted (public/media/km-hero-video.mp4, served by the Railway app),
// muted and looping like the old kaiming.org hero, with the programs section's title and intro (CMS fields
// text-0 / text-1) in white over it. The poster image shows until the video is playing; it plays inline on
// phones because it is muted. Visitors who prefer reduced motion see the poster only.
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function HeroVideo({ attributes, children }) {
  const video = useRef(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { el.pause(); return; }
    el.muted = true;
    el.play()?.catch(() => {});
  }, []);
  return <div {...attributes} className={`${attributes?.className || ''} km-hero-video`.trim()}>
    {children}
    <video ref={video} className={`km-hero-video__media${playing ? ' is-ready' : ''}`} src={`${base}/media/km-hero-video.mp4`}
      poster={`${base}/media/km-hero-poster.jpg`} autoPlay muted loop playsInline preload="metadata" aria-hidden="true"
      tabIndex={-1} onPlaying={() => setPlaying(true)} />
    <div className="km-hero-overlay">
      <h2><HomeText field="text-0" /></h2>
      <p><HomeText field="text-1" /></p>
    </div>
  </div>;
}
