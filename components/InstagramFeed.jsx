'use client';
import Script from 'next/script';

// Instagram preview (@kaimingheadstart), carried over from the old kaiming.org home page.
// The feed itself is rendered by the same Elfsight widget the old site uses.
const ELFSIGHT_APP_ID = '6b371d74-b25f-481b-ae99-9cd96a19e9fe';
const HEADINGS = {
  en: 'Experience the Heart of Our Community',
  'zh-Hant': '感受我們社區的溫暖',
  es: 'Vive el corazón de nuestra comunidad',
};

export default function InstagramFeed({ locale = 'en' }) {
  return <section className="km-instagram-feed" aria-labelledby="km-instagram-feed-title">
    <h2 id="km-instagram-feed-title">{HEADINGS[locale] || HEADINGS.en}</h2>
    <div className="km-instagram-feed__widget">
      <div className={`elfsight-app-${ELFSIGHT_APP_ID}`} data-elfsight-app-lazy />
      <noscript><a href="https://www.instagram.com/kaimingheadstart/">Instagram @kaimingheadstart</a></noscript>
    </div>
    <Script src="https://elfsightcdn.com/platform.js" strategy="lazyOnload" />
  </section>;
}
