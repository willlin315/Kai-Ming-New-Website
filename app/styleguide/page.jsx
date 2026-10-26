import { BRAND_COLORS, BRAND_SCALE, BRAND_LOGOS, BRAND_FONTS, contrastRatio } from '../../lib/brand';
import { basePath } from '../../lib/content';
import './styleguide.css';

export const metadata = { title: 'Brand styleguide | Kai Ming Head Start', robots: { index: false, follow: false } };

const rating = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large' : 'Low contrast');
const swatchOrder = ['primary', 'accent', 'ice', 'foreground', 'accentStrong', 'muted', 'accentSoft', 'sky', 'aqua', 'lagoon', 'black', 'logoBlue', 'logoText'];
const tokenName = { primary: '--primary', accent: '--accent', ice: '--background-soft', foreground: '--foreground', accentStrong: '--accent-strong', muted: '--muted', accentSoft: '--accent-soft', sky: '--sky', aqua: '--aqua', lagoon: '--lagoon', black: '—', logoBlue: '--logo-blue', logoText: '--logo-text' };
const typeScale = [
  ['Display', 'h1', '48px / 1.25', 'Potential Has No Limits'],
  ['Heading 2', 'h2', '32px / 1.3', 'Discover Our Centers Near You'],
  ['Heading 3', 'h3', '22px / 1.4', 'Infant & Toddler Care'],
  ['Body', 'p', '16px / 1.7', 'Kai Ming Head Start has served San Francisco families since 1975.'],
  ['Small', 'small', '13px / 1.5', 'CA Child Care License # 384004001'],
];
const languages = [
  ['English', 'en', 'Potential Has No Limits', 'Nine centers across San Francisco, each offering care and education close to home.'],
  ['繁體中文', 'zh-Hant', '潛能無限', '九個中心遍布舊金山，在住家附近提供照護與教育。'],
  ['Español', 'es', 'El potencial no tiene límites', 'Nueve centros en San Francisco ofrecen cuidado y educación cerca de casa.'],
];

export default function Styleguide() {
  return <main className="sg" lang="en">
    <header className="sg-hero">
      <img src={`${basePath}/brand/kai-ming-horizontal.svg`} alt="Kai Ming — Potential Has No Limits" width="360" height="97" />
      <div>
        <p className="sg-eyebrow">Internal reference · not linked from the site</p>
        <h1>Brand styleguide</h1>
        <p>Design tokens from the Kai Ming brand book applied to the current Wix-based layout. Every color and font on the site reads from the CSS variables below (<code>lib/brand.js</code>).</p>
      </div>
    </header>

    <nav className="sg-toc" aria-label="Styleguide sections">
      {[['colors', 'Colors'], ['scale', 'Extended palette'], ['type', 'Typography'], ['components', 'Components'], ['logos', 'Logos'], ['rules', 'Usage rules']].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
    </nav>

    <section id="colors" aria-labelledby="colors-h">
      <h2 id="colors-h">Colors</h2>
      <p className="sg-lede">Contrast is measured against white and against deep navy text. WCAG AA needs 4.5:1 for body text and 3:1 for large text.</p>
      <div className="sg-swatches">
        {swatchOrder.map((key) => {
          const c = BRAND_COLORS[key];
          const onWhite = contrastRatio(c.hex, '#FFFFFF');
          const onNavy = contrastRatio(c.hex, BRAND_COLORS.foreground.hex);
          return <article key={key} className="sg-swatch">
            <div className="sg-chip" style={{ background: c.hex }}><span style={{ color: onWhite >= onNavy ? '#fff' : BRAND_COLORS.foreground.hex }}>Aa</span></div>
            <h3>{c.name}</h3>
            <dl>
              <div><dt>Hex</dt><dd><code>{c.hex}</code></dd></div>
              <div><dt>Token</dt><dd><code>{tokenName[key]}</code></dd></div>
              <div><dt>vs white</dt><dd>{onWhite.toFixed(1)}:1 · {rating(onWhite)}</dd></div>
              <div><dt>vs navy</dt><dd>{onNavy.toFixed(1)}:1 · {rating(onNavy)}</dd></div>
            </dl>
            <p>{c.use}</p>
          </article>;
        })}
      </div>
    </section>

    <section id="scale" aria-labelledby="scale-h">
      <h2 id="scale-h">Extended palette</h2>
      <div className="sg-scale" role="list">
        {BRAND_SCALE.map((hex) => <div role="listitem" key={hex}><span style={{ background: hex }} /><code>{hex}</code></div>)}
      </div>
    </section>

    <section id="type" aria-labelledby="type-h">
      <h2 id="type-h">Typography</h2>
      <p className="sg-lede">Comfortaa × 思源柔黑體. Latin text uses Comfortaa; Traditional Chinese uses Noto Sans TC (the open-source 思源 family) until a licensed web build of 源柔黑體 is chosen.</p>
      <div className="sg-fonts">
        <article><h3 className="sg-font-name" style={{ fontFamily: BRAND_FONTS.heading }}>Comfortaa</h3><p><code>--font-heading</code>, <code>--font-body</code></p><p className="sg-glyphs" style={{ fontFamily: BRAND_FONTS.heading }}>Aa Bb Cc 0123456789</p></article>
        <article><h3 className="sg-font-name" style={{ fontFamily: BRAND_FONTS.zh }}>思源黑體 Noto Sans TC</h3><p><code>--font-zh</code> (applied to <code>lang="zh-Hant"</code>)</p><p className="sg-glyphs" style={{ fontFamily: BRAND_FONTS.zh }}>幼兒園 潛能無限 照護與教育 0123</p></article>
      </div>
      <table className="sg-table">
        <caption>Type scale</caption>
        <thead><tr><th scope="col">Style</th><th scope="col">Size / line height</th><th scope="col">Sample</th></tr></thead>
        <tbody>{typeScale.map(([name, Tag, size, sample]) => <tr key={name}><th scope="row">{name}</th><td>{size}</td><td><Tag className={`sg-type-${Tag}`}>{sample}</Tag></td></tr>)}</tbody>
      </table>
      <div className="sg-langs">
        {languages.map(([label, lang, title, body]) => <article key={lang} lang={lang}><p className="sg-eyebrow" lang="en">{label}</p><h3>{title}</h3><p>{body}</p></article>)}
      </div>
    </section>

    <section id="components" aria-labelledby="components-h">
      <h2 id="components-h">Components</h2>
      <h3 className="sg-sub">Buttons</h3>
      <div className="sg-row">
        <a className="sg-btn sg-btn-primary" href="#components">Apply Now</a>
        <a className="sg-btn sg-btn-accent" href="#components">View Our Centers</a>
        <a className="sg-btn sg-btn-outline" href="#components">Learn More</a>
        <a className="sg-link" href="#components">Text link</a>
      </div>
      <h3 className="sg-sub">Cards</h3>
      <div className="sg-cards">
        <article className="sg-card"><h4>Prenatal &amp; Home-Based</h4><p className="sg-card-meta">0 – 36 months</p><p>Weekly home visits and bi-weekly center-based socialization.</p></article>
        <article className="sg-card sg-card-muted"><h4>Infant &amp; Toddler Care</h4><p className="sg-card-meta">3 – 36 months</p><p>Nurturing, relationship-based care for early learning.</p></article>
        <article className="sg-card sg-card-ice"><h4>Preschool</h4><p className="sg-card-meta">3 – 5 years</p><p>Culturally responsive, child-interest-led curriculum.</p></article>
      </div>
      <h3 className="sg-sub">Table</h3>
      <table className="sg-table sg-data">
        <caption>Teacher : child ratio</caption>
        <thead><tr><th scope="col">Program</th><th scope="col">Ages</th><th scope="col">Ratio</th></tr></thead>
        <tbody><tr><th scope="row">Infant</th><td>3–18 months</td><td>1:3</td></tr><tr><th scope="row">Toddler</th><td>18–36 months</td><td>1:4</td></tr><tr><th scope="row">Preschool</th><td>3–5 years</td><td>1:8</td></tr></tbody>
      </table>
      <h3 className="sg-sub">Form field (layout only)</h3>
      <div className="sg-field"><label htmlFor="sg-name">Parent name</label><input id="sg-name" type="text" placeholder="First and last name" /></div>
    </section>

    <section id="logos" aria-labelledby="logos-h">
      <h2 id="logos-h">Logos</h2>
      <p className="sg-lede">Vector files from the brand book in <code>/public/brand/</code>. Keep clear space of at least the height of the “K” dot on every side.</p>
      <div className="sg-logos">
        {BRAND_LOGOS.map((logo) => <figure key={logo.file} className={logo.dark ? 'sg-logo-dark' : ''}>
          <div><img src={`${basePath}/brand/${logo.file}`} alt={`Kai Ming logo, ${logo.name.toLowerCase()}`} /></div>
          <figcaption><strong>{logo.name}</strong><span>{logo.use}</span><a href={`${basePath}/brand/${logo.file}`} download>Download SVG</a></figcaption>
        </figure>)}
      </div>
    </section>

    <section id="rules" aria-labelledby="rules-h">
      <h2 id="rules-h">Usage rules</h2>
      <ul className="sg-rules">
        <li><strong>Text colors:</strong> use deep navy <code>#05173C</code> or black for body text, primary blue <code>#436EA9</code> for links and headings, deep teal <code>#03616D</code> for teal text.</li>
        <li><strong>Never as text or behind white text:</strong> accent teal <code>#9ACED0</code>, ice <code>#D3EAF1</code>, sky, aqua and lagoon. They fail contrast.</li>
        <li><strong>Accent buttons</strong> use deep navy text on <code>#9ACED0</code>. <strong>Primary buttons</strong> use white text on <code>#436EA9</code>.</li>
        <li><strong>Logo colors</strong> <code>#1566AB</code> and <code>#282828</code> belong to the artwork only; do not reuse them for UI.</li>
        <li><strong>Seasonal themes</strong> (later) override the same CSS variables under <code>[data-theme]</code>; components never hard-code hex values.</li>
      </ul>
    </section>
  </main>;
}
