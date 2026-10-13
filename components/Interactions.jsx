'use client';
import { useEffect } from 'react';
import { basePath, legacyRoutes } from '../lib/client-routes';

export default function Interactions() {
  useEffect(() => {
    const legacy = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
    if (legacyRoutes.includes(legacy)) window.location.replace(`${basePath}/en/${legacy === 'home' ? '' : `${legacy}/`}`);
    const click = (event) => {
      if (!(event.target instanceof Element)) return;
      const trigger = event.target.closest('wix-dropdown-menu [role="button"]');
      if (trigger) {
        const item = trigger.closest('li');
        if (item) trigger.setAttribute('aria-expanded', String(item.toggleAttribute('data-open')));
      }
      if (event.target.closest('[data-export-disabled]')) {
        event.preventDefault();
        window.alert('This feature is awaiting connection to the company backend.');
      }
    };
    const keydown = (event) => {
      if (event.key === 'Escape') document.querySelectorAll('[data-open]').forEach((el) => {
        el.removeAttribute('data-open');
        el.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false');
      });
      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof Element && event.target.matches('wix-dropdown-menu [role="button"]')) {
        event.preventDefault(); event.target.click();
      }
    };
    const submit = (event) => {
      event.preventDefault();
      window.alert('Preview only: your information has not been submitted.');
    };
    document.addEventListener('click', click);
    document.addEventListener('keydown', keydown);
    document.addEventListener('submit', submit);
    return () => {
      document.removeEventListener('click', click);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('submit', submit);
    };
  }, []);
  return null;
}
