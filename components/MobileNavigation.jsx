'use client';
import {translate,localePaths} from '../lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { basePath } from '../lib/client-routes';

export default function MobileNavigation({ groups = [],locale='en' }) {
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(min-width: 1001px)');
    const close = () => setOpen(false);
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  const onKeyDown = (event) => {
    if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
  };
  return <div className="km-mobile-header" onKeyDown={onKeyDown}>
    <div className="km-mobile-bar">
      <a href={`${basePath}/${localePaths[locale]}/`} aria-label="Kai Ming Head Start home"><img src={`${basePath}/media/kai-ming-logo.png`} alt="Kai Ming Head Start" width="60" height="60" /></a>
      <a className="km-mobile-apply" href={`${basePath}/${localePaths[locale]}/how-to-enroll/`}>{translate('Apply Now',locale)}</a>
      <button ref={button} type="button" aria-expanded={open} aria-controls="km-mobile-navigation" aria-label={translate(open ? 'Close menu' : 'Open menu',locale)} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
    </div>
    <nav id="km-mobile-navigation" aria-label={translate('Mobile site navigation',locale)} hidden={!open}>
      {groups.map((group) => group.links.length ? <details key={group.label}>
        <summary>{group.label}</summary>
        {group.href && <a href={group.href}>{group.label}</a>}
        {group.links.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}
      </details> : <a key={group.label} href={group.href}>{group.label}</a>)}
      <a href={`${basePath}/${localePaths[locale]}/copy-of-family-support/`}>Find A Center</a>
    </nav>
  </div>;
}
