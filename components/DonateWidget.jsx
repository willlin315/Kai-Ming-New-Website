'use client';
import { useEffect } from 'react';

// Top of the Donate page: the same Give Lively donation widget the old kaiming.org Donate page embeds.
const WIDGET_SCRIPT = 'https://secure.givelively.org/widgets/branded_donation/kai-ming-inc/kai-ming-inc.js';
const WIDGET_SRC = 'https://secure.givelively.org/donate/kai-ming-inc/kai-ming-inc?ref=sd_widget';
const DONATE_URL = 'https://secure.givelively.org/donate/kai-ming-inc/kai-ming-inc';
const TEXT = {
  en: {
    title: 'Donate',
    intro: 'Since 1975, Kai Ming has served the needs of various communities by embracing every child as our own. Today we are asking for your help to give us the support we need to continue our mission of creating lasting opportunities for San Francisco’s children and families in need.',
    fallback: 'Donate through Give Lively',
  },
  'zh-Hant': {
    title: '捐款支持',
    intro: '自 1975 年以來，啟明把每個孩子都當成自己的孩子，服務各個社區的需要。今天，我們請您給予支持，幫助我們延續使命，為舊金山有需要的兒童和家庭創造長久的機會。',
    fallback: '透過 Give Lively 捐款',
  },
  es: {
    title: 'Donar',
    intro: 'Desde 1975, Kai Ming ha atendido las necesidades de diversas comunidades acogiendo a cada niño como propio. Hoy le pedimos su ayuda para brindarnos el apoyo que necesitamos y continuar nuestra misión de crear oportunidades duraderas para los niños y las familias de San Francisco que más lo necesitan.',
    fallback: 'Donar a través de Give Lively',
  },
};

export default function DonateWidget({ locale = 'en', attributes = {} }) {
  const text = TEXT[locale] || TEXT.en;
  useEffect(() => {
    // The Give Lively script fills #give-lively-widget once per load, so add it again each time the page mounts.
    document.querySelectorAll('script[data-km-give-lively]').forEach((node) => node.remove());
    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.dataset.kmGiveLively = '';
    document.head.appendChild(script);
    return () => script.remove();
  }, []);
  return <section id={attributes.id} className="km-donate-top" aria-labelledby="km-donate-title">
    <div className="km-donate-top__inner">
      <h1 id="km-donate-title">{text.title}</h1>
      <p>{text.intro}</p>
      <div data-widget-src={WIDGET_SRC} id="give-lively-widget" className="gl-branded-donation-widget">
        <a className="km-donate-top__fallback" href={DONATE_URL} target="_blank" rel="noopener">{text.fallback}</a>
      </div>
    </div>
  </section>;
}
