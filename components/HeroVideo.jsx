'use client';
import { useEffect, useState } from 'react';

// Home hero: the same looping, muted YouTube video the old kaiming.org home page used ("KM website video").
// The poster image renders first (server HTML) and stays visible until the player has loaded and its
// start-up overlay has faded (about 3 s); the video plays
// inline on phones (playsinline) because it is muted.
const VIDEO_ID = '751rmSPf3Pg';
const params = new URLSearchParams({ autoplay: '1', mute: '1', loop: '1', playlist: VIDEO_ID, controls: '0',
  playsinline: '1', rel: '0', modestbranding: '1', disablekb: '1', iv_load_policy: '3' });

export default function HeroVideo({ attributes, children }) {
  const [play, setPlay] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) setPlay(true);
  }, []);
  return <div {...attributes} className={`${attributes?.className || ''} km-hero-video`.trim()}>
    {children}
    {play && <div className={`km-hero-video__frame${loaded ? ' is-loaded' : ''}`}>
      <iframe src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?${params}`} title="Kai Ming Head Start video"
        allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1} onLoad={() => setTimeout(() => setLoaded(true), 3000)} />
    </div>}
  </div>;
}
