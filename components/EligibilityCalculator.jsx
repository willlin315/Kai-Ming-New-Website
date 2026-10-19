'use client';
import { useEffect, useRef, useState } from 'react';
import { basePath } from '../lib/client-routes';

export default function EligibilityCalculator({ attributes,locale='en' }) {
  const frame = useRef(null);
  const [height, setHeight] = useState(1320);
  useEffect(() => {
    const receive = (event) => {
      // Only accept messages from this calculator, including its opaque sandbox origin.
      if (event.source !== frame.current?.contentWindow) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.kmElig === 'height' && Number.isFinite(message.height)) {
        setHeight(Math.max(320, Math.min(6000, Math.ceil(message.height))));
      }
      if (message.kmElig === 'go' && ['apply', 'inquiry'].includes(message.to)) {
        const tab = document.getElementById(message.to === 'apply' ? 'tab-comp-mufzsqvy' : 'tab-comp-mufzsqv5');
        tab?.click();
        tab?.focus({ preventScroll: true });
        tab?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  return <div {...attributes} style={{ ...attributes.style, height: 'auto' }}>
    <iframe ref={frame} src={`${basePath}/widgets/eligibility/?lang=${locale==='zh-Hant'?'zh-hk':locale}`}
      title="Eligibility checker for free or low-cost tuition" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      style={{ display: 'block', width: '100%', height, border: 0 }} />
  </div>;
}
