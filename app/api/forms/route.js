import nodemailer from 'nodemailer';

// Website form submissions -> email. Settings (Railway service variables):
//   SMTP_USER, SMTP_PASS   account that sends the email (Google Workspace: the address + an app password)
//   SMTP_HOST, SMTP_PORT   optional, default smtp.gmail.com / 465
//   FORM_TO                where submissions go (comma-separated for several people)
//   FORM_TO_FAMILY_SUPPORT, FORM_TO_OUR_CENTERS, FORM_TO_ENROLLMENT_INQUIRY, FORM_TO_ENROLLMENT_APPLICATION
//                          optional per-form recipients that override FORM_TO
//   FORM_FROM              optional sender shown in the email, default "Kai Ming Website <SMTP_USER>"
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMS = {
  'family-support': 'Family Support contact form',
  'our-centers': 'Our Centers contact form',
  'enrollment-inquiry': 'Enrollment inquiry',
  'enrollment-application': 'Enrollment pre-application',
};
const LOCALES = { en: 'English', 'zh-Hant': 'Traditional Chinese', es: 'Spanish' };
const recent = new Map(); // ip -> timestamps (simple in-memory rate limit: 5 per 10 minutes)

const text = (value, max) => String(value ?? '').replace(/\r\n?/g, '\n').slice(0, max).trim();
const escapeHtml = (value) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = (body, status = 200) => Response.json(body, { status });

export async function POST(request) {
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (hits.length >= 5) return json({ error: 'Too many submissions. Please try again later.' }, 429);
  recent.set(ip, [...hits, now]);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
  if (body?.company_website) return json({ ok: true }); // honeypot filled in: quietly ignore
  const name = FORMS[body?.form];
  if (!name || !Array.isArray(body.rows) || !body.rows.length || body.rows.length > 300) return json({ error: 'Invalid form.' }, 400);
  const rows = body.rows.map((row) => ({ section: text(row?.section, 120), label: text(row?.label, 200), value: text(row?.value, 5000) })).filter((row) => row.label && row.value);
  if (!rows.length) return json({ error: 'The form is empty.' }, 400);

  const { SMTP_USER: user, SMTP_PASS: pass } = process.env;
  const to = process.env[`FORM_TO_${body.form.toUpperCase().replace(/-/g, '_')}`] || process.env.FORM_TO;
  if (!user || !pass || !to) {
    console.error('[forms] Email is not configured (SMTP_USER, SMTP_PASS, FORM_TO).');
    return json({ error: 'Form email is not configured.' }, 503);
  }

  const find = (pattern) => rows.find((row) => pattern.test(row.label))?.value || '';
  const replyTo = rows.find((row) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.value))?.value;
  const person = [find(/first name|名字|nombre/i), find(/last name|姓氏|apellido/i)].filter(Boolean).join(' ');
  const subject = `[Kai Ming website] ${name}${person ? ` – ${person}` : ''}`;
  const page = text(body.page, 200);
  const locale = LOCALES[body.locale] || text(body.locale, 20);
  const sections = [];
  for (const row of rows) {
    if (!sections.length || sections[sections.length - 1].title !== row.section) sections.push({ title: row.section, rows: [] });
    sections[sections.length - 1].rows.push(row);
  }
  const plain = [`${name}`, `Page: ${page}`, `Language: ${locale}`, '',
    ...sections.flatMap((s) => [...(s.title ? [`== ${s.title} ==`] : []), ...s.rows.map((r) => `${r.label}: ${r.value}`), ''])].join('\n');
  const html = `<div style="font:14px/1.5 Arial,sans-serif;color:#1f1f1f">
<h2 style="margin:0 0 4px;font-size:18px">${escapeHtml(name)}</h2>
<p style="margin:0 0 16px;color:#555">Page: ${escapeHtml(page)} · Language: ${escapeHtml(locale)}</p>
${sections.map((s) => `${s.title ? `<h3 style="margin:18px 0 6px;font-size:15px;color:#3f6aa8">${escapeHtml(s.title)}</h3>` : ''}
<table style="border-collapse:collapse;width:100%;max-width:640px">${s.rows.map((r) => `<tr><td style="padding:6px 10px;border:1px solid #e3e8ec;background:#f6f9fb;width:38%;vertical-align:top"><b>${escapeHtml(r.label)}</b></td><td style="padding:6px 10px;border:1px solid #e3e8ec;white-space:pre-wrap">${escapeHtml(r.value)}</td></tr>`).join('')}</table>`).join('\n')}
</div>`;

  const port = Number(process.env.SMTP_PORT || 465);
  try {
    const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465, auth: { user, pass } });
    await transport.sendMail({ from: process.env.FORM_FROM || `Kai Ming Website <${user}>`, to, replyTo, subject, text: plain, html });
  } catch (error) {
    console.error('[forms] Sending failed:', error?.message);
    return json({ error: 'The message could not be sent.' }, 502);
  }
  return json({ ok: true });
}
