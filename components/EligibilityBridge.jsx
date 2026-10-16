'use client';
import { useEffect } from 'react';

// Connects the How to Enroll eligibility checker (public/embeds/eligibility-checker.html)
// to the page, matching the Wix page code: send the page language to the checker, and
// when a result button is pressed, open the matching form tab and scroll to the forms.
const tabLabels = { apply: 'Apply Online', inquiry: 'Submit Inquiry' };

export default function EligibilityBridge() {
  useEffect(() => {
    const frame = document.querySelector('iframe[data-km-eligibility]');
    if (!frame) return undefined;
    const lang = (document.documentElement.lang || 'en').toLowerCase().startsWith('zh') ? 'zh-hk'
      : (document.documentElement.lang || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
    const sendLang = () => frame.contentWindow?.postMessage({ kmLang: lang }, '*');
    const onMessage = (event) => {
      if (event.source !== frame.contentWindow) return;
      const data = event.data || {};
      if (data.kmElig === 'ready') sendLang();
      if (data.kmElig === 'go') {
        const label = tabLabels[data.to === 'apply' ? 'apply' : 'inquiry'];
        const tab = [...document.querySelectorAll('.wixui-tabs [role="tab"]')]
          .find((element) => element.textContent.trim() === label);
        tab?.click();
        const target = tab?.closest('section') || tab?.closest('.wixui-tabs');
        if (target) {
          const header = document.querySelector('header, km-site-header, [data-km-header]');
          const offset = header && getComputedStyle(header).position.match(/fixed|sticky/) ? header.offsetHeight : 0;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', sendLang);
    sendLang();
    return () => {
      window.removeEventListener('message', onMessage);
      frame.removeEventListener('load', sendLang);
    };
  }, []);
  return null;
}
