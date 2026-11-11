// Website forms (Family Support / Our Centers contact, Enrollment inquiry and pre-application): read what the visitor
// filled in, in page order and grouped under the form's section titles, and send it to /api/forms/, which emails it.
import { basePath } from './client-routes';

const TEXT = {
  en: { sending: 'Sending…', sent: 'Thank you! Your message has been sent. We will contact you soon.', failed: 'Sorry, your message could not be sent. Please call (415) 982-4777 or email info@kaiming.org.' },
  'zh-Hant': { sending: '傳送中…', sent: '謝謝！您的訊息已送出，我們會盡快與您聯絡。', failed: '抱歉，訊息未能送出。請致電 (415) 982-4777 或寫信至 info@kaiming.org。' },
  es: { sending: 'Enviando…', sent: '¡Gracias! Su mensaje fue enviado. Nos comunicaremos con usted pronto.', failed: 'Lo sentimos, no se pudo enviar su mensaje. Llame al (415) 982-4777 o escriba a info@kaiming.org.' },
};

// Which form this is, from the page and the form's own label. Forms not listed here keep the preview-only behavior.
export function formKey(form) {
  const page = form.closest('.km-responsive')?.getAttribute('data-page');
  const label = form.getAttribute('aria-label') || '';
  if (page === 'familysupport') return 'family-support';
  if (page === 'our-centers') return 'our-centers';
  if (page === 'how-to-enroll' && /pre-application/i.test(label)) return 'enrollment-application';
  if (page === 'how-to-enroll' && /inquiry/i.test(label)) return 'enrollment-inquiry';
  return null;
}

const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
const labelOf = (el) => {
  const byId = (ids) => (ids || '').split(/\s+/).filter(Boolean).map((id) => document.getElementById(id)?.innerText || '').join(' ');
  return clean(el.labels?.[0]?.innerText || el.getAttribute('aria-label') || byId(el.getAttribute('aria-labelledby')) || el.placeholder || el.name).replace(/\s*\*$/, '');
};
const groupLabel = (el) => {
  const group = el.closest('fieldset, [role="radiogroup"], [role="group"]');
  const ids = group?.getAttribute('aria-labelledby');
  const text = ids ? ids.split(/\s+/).map((id) => document.getElementById(id)?.innerText || '').join(' ') : group?.querySelector('legend')?.innerText;
  return clean(text || el.name.replace(/_[0-9a-f]{4}$/, '').replace(/_/g, ' ')).replace(/\s*\*$/, '');
};

export function collectForm(form) {
  const rows = []; let section = ''; let note = '';
  const add = (label, value) => {
    const last = rows.find((row) => row.section === section && row.label === label && row.multi);
    if (last) last.value += `, ${value}`; else rows.push({ section, label, value });
  };
  for (const el of form.querySelectorAll('h1,h2,h3,h4,h5,h6,legend,p,input,select,textarea')) {
    if (/^H\d$/.test(el.tagName)) { section = clean(el.innerText); note = ''; continue; }
    if (el.tagName === 'P') { const text = clean(el.innerText); if (text && text.length <= 60 && !el.closest('label, fieldset')) note = text; continue; }
    if (el.tagName === 'LEGEND' || el.disabled || ['button', 'submit', 'hidden', 'file'].includes(el.type)) continue;
    if (el.type === 'checkbox' || el.type === 'radio') {
      if (!el.checked) continue;
      const value = labelOf(el);
      const label = groupLabel(el) || value;
      if (el.type === 'checkbox') { const before = rows.length; add(label, value); if (rows.length > before) rows[rows.length - 1].multi = true; } else add(label, value);
      continue;
    }
    const value = el.tagName === 'SELECT' ? (el.value ? clean(el.selectedOptions[0]?.text) : '') : (el.value || '').trim();
    if (!value) continue;
    let label = labelOf(el);
    if (el.tagName === 'SELECT' && /choice|選|opción/i.test(label) && note) label = `${note} – ${label}`;
    add(label, value);
  }
  return rows.map(({ section: s, label, value }) => ({ section: s, label, value }));
}

export function prepareForm(form) {
  if (form.dataset.kmForm) return;
  form.dataset.kmForm = formKey(form) || '';
  if (!form.dataset.kmForm) return;
  const notice = form.querySelector('.export-notice'); if (notice) notice.style.display = 'none';
  // Some exported forms use a plain button for "Submit"; make the last labelled button submit the form.
  const buttons = [...form.querySelectorAll('button')].filter((button) => clean(button.innerText));
  const submit = buttons[buttons.length - 1];
  if (submit) submit.setAttribute('type', 'submit');
  // Honeypot for spam bots: hidden from people and screen readers.
  const trap = document.createElement('input');
  Object.assign(trap, { type: 'text', name: 'company_website', tabIndex: -1, autocomplete: 'off' });
  trap.setAttribute('aria-hidden', 'true');
  trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  form.appendChild(trap);
}

export async function sendForm(form) {
  const key = form.dataset.kmForm;
  const lang = form.closest('[lang]')?.getAttribute('lang') || 'en';
  const text = TEXT[lang] || TEXT.en;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  let status = form.querySelector('.km-form-status');
  if (!status) { status = document.createElement('p'); status.className = 'km-form-status'; status.setAttribute('role', 'status'); form.appendChild(status); }
  const submit = form.querySelector('[type="submit"]');
  status.dataset.state = 'sending'; status.textContent = text.sending;
  if (submit) submit.disabled = true;
  try {
    const response = await fetch(`${basePath}/api/forms/`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ form: key, page: location.pathname, locale: lang, rows: collectForm(form), company_website: form.elements.company_website?.value || '' }),
    });
    if (!response.ok) throw new Error(String(response.status));
    form.reset();
    status.dataset.state = 'sent'; status.textContent = text.sent;
  } catch {
    status.dataset.state = 'error'; status.textContent = text.failed;
  } finally {
    if (submit) submit.disabled = false;
    status.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
