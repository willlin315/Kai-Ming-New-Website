// Builds the Privacy Policy and Terms of Use pages from content/legal/*.html.
// They reuse the Blog page's exported Wix header, footer and CSS so the layout
// matches the rest of the site. Run `npm run legal:build` after editing the text;
// Chinese and Spanish strings live in content/i18n/site.json like every other page.
import fs from 'node:fs';

const template = JSON.parse(fs.readFileSync('content/pages/blog.json', 'utf8'));
const pages = [
  ['privacy-policy', 'Privacy Policy | Kai Ming Head Start'],
  ['terms-of-use', 'Terms of Use | Kai Ming Head Start'],
];
const contact = '<address class="km-legal-contact"><strong>Kai Ming Inc.</strong>'
  + '<span>934 Howard Street, San Francisco, CA 94103</span>'
  + '<a href="tel:+14159824777">(415) 982-4777</a>'
  + '<a href="mailto:info@kaiming.org">info@kaiming.org</a></address>';
const newsMain = /<main class="km-news-page">[\s\S]*?<\/main>/;
if (!newsMain.test(template.html)) throw new Error('Blog template main not found');

for (const [key, title] of pages) {
  const body = fs.readFileSync(`content/legal/${key}.html`, 'utf8').trim()
    .replace('<km-legal-contact></km-legal-contact>', contact)
    .replace(/>\s+</g, '><');
  const html = template.html.replace(newsMain, `<main class="km-legal-page"><article class="km-legal-article">${body}</article></main>`);
  fs.writeFileSync(`content/pages/${key}.json`, JSON.stringify({ title, html, css: template.css }) + '\n');
  console.log(`Wrote content/pages/${key}.json`);
}
