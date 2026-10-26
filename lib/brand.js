// Kai Ming brand design tokens — the single source of truth for colors,
// typography and logos. Values come from the Kai Ming brand book
// (primary #436EA9, accent #9ACED0, ice #D3EAF1, Comfortaa × 思源柔黑體).
//
// The exported Wix layout keeps its structure; `brandCss()` and `brandHtml()`
// swap the old Wix theme colors and fonts for these tokens at build time.

export const BRAND_COLORS = {
  primary: { hex: '#436EA9', rgb: '67,110,169', name: 'Primary blue', use: 'Buttons, links, headings, footer' },
  accent: { hex: '#9ACED0', rgb: '154,206,208', name: 'Accent teal', use: 'Call-to-action fills (dark text only), highlights' },
  ice: { hex: '#D3EAF1', rgb: '211,234,241', name: 'Ice blue', use: 'Section backgrounds' },
  foreground: { hex: '#05173C', rgb: '5,23,60', name: 'Deep navy', use: 'Body text on light backgrounds' },
  accentStrong: { hex: '#03616D', rgb: '3,97,109', name: 'Deep teal', use: 'Teal text, hover states' },
  muted: { hex: '#EDF7F9', rgb: '237,247,249', name: 'Mist', use: 'Card and panel backgrounds' },
  accentSoft: { hex: '#E3F2F3', rgb: '227,242,243', name: 'Soft teal', use: 'Alternate card backgrounds' },
  sky: { hex: '#7EBBF1', rgb: '126,187,241', name: 'Sky blue', use: 'Decoration only' },
  aqua: { hex: '#87DEE6', rgb: '135,222,230', name: 'Aqua', use: 'Decoration only' },
  lagoon: { hex: '#55B3BA', rgb: '85,179,186', name: 'Lagoon', use: 'Decoration only' },
  black: { hex: '#020202', rgb: '2,2,2', name: 'Ink', use: 'Maximum-contrast text' },
  logoBlue: { hex: '#1566AB', rgb: '21,102,171', name: 'Logo blue', use: 'Logo artwork only' },
  logoText: { hex: '#282828', rgb: '40,40,40', name: 'Logo charcoal', use: 'Logo wordmark only' },
};

// The nine-step extended palette from the brand book, dark to light to teal.
export const BRAND_SCALE = ['#020202', '#05173C', '#436EA9', '#7EBBF1', '#D3EAF1', '#9ACED0', '#87DEE6', '#55B3BA', '#03616D'];

export const BRAND_FONTS = {
  heading: 'var(--font-comfortaa), var(--font-noto-tc), "Noto Sans TC", sans-serif',
  body: 'var(--font-comfortaa), var(--font-noto-tc), "Noto Sans TC", sans-serif',
  zh: 'var(--font-noto-tc), "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif',
};

export const BRAND_LOGOS = [
  { file: 'kai-ming-horizontal.svg', name: 'Horizontal', use: 'Default on light backgrounds' },
  { file: 'kai-ming-stacked.svg', name: 'Stacked', use: 'Site header and square spaces' },
  { file: 'kai-ming-icon.svg', name: 'Icon', use: 'Favicon, avatars, small spaces' },
  { file: 'kai-ming-horizontal-white.svg', name: 'Horizontal, white', use: 'Dark or photo backgrounds', dark: true },
  { file: 'kai-ming-stacked-white.svg', name: 'Stacked, white', use: 'Dark or photo backgrounds', dark: true },
  { file: 'kai-ming-icon-white.svg', name: 'Icon, white', use: 'Dark or photo backgrounds', dark: true },
  { file: 'kai-ming-badge-blue.svg', name: 'Badge, blue', use: 'Social avatars, stickers' },
  { file: 'kai-ming-badge-teal.svg', name: 'Badge, teal', use: 'Social avatars, stickers' },
  { file: 'kai-ming-bar.svg', name: 'Bar', use: 'Banners, signage' },
];

export function tokensCss() {
  const c = BRAND_COLORS;
  const vars = {
    '--primary': c.primary.hex, '--primary-rgb': c.primary.rgb, '--primary-foreground': '#FFFFFF',
    '--accent': c.accent.hex, '--accent-rgb': c.accent.rgb, '--accent-foreground': c.foreground.hex,
    '--accent-strong': c.accentStrong.hex, '--accent-strong-rgb': c.accentStrong.rgb,
    '--accent-soft': c.accentSoft.hex, '--accent-soft-rgb': c.accentSoft.rgb,
    '--background': '#FFFFFF', '--background-soft': c.ice.hex, '--ice': c.ice.hex, '--ice-rgb': c.ice.rgb,
    '--foreground': c.foreground.hex, '--foreground-rgb': c.foreground.rgb,
    '--muted': c.muted.hex, '--muted-rgb': c.muted.rgb, '--muted-foreground': '#4A5568',
    '--border': '#C9DDE4', '--ring': c.primary.hex,
    '--sky': c.sky.hex, '--sky-rgb': c.sky.rgb, '--aqua': c.aqua.hex, '--lagoon': c.lagoon.hex,
    '--logo-blue': c.logoBlue.hex, '--logo-text': c.logoText.hex,
    '--radius': '12px', '--radius-pill': '999px',
    '--font-heading': BRAND_FONTS.heading, '--font-body': BRAND_FONTS.body, '--font-zh': BRAND_FONTS.zh,
  };
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v};`).join('');
  // Traditional Chinese pages use 思源 (Noto Sans TC) first so Latin digits match the CJK text.
  return `:root{${body}}:root[lang="zh-HK"],[lang="zh-HK"]{--font-heading:${BRAND_FONTS.zh};--font-body:${BRAND_FONTS.zh};}`;
}

// --- Wix → brand mapping -------------------------------------------------
// Each entry: [token, literal hex, list of Wix colors (rgb triplets and hex)].
const COLOR_MAP = [
  ['primary', '#436EA9', ['15,77,107', '39,75,109', '43,86,114', '12,80,114', '29,103,205', '77,109,165', '80,146,179', '46,106,138', '43,104,156', '23,78,64', '17,109,255', '28,49,244', '47,84,221', '72,84,199', '0,136,203', '41,50,217']],
  ['foreground', '#05173C', ['31,59,92', '19,66,80', '85,65,2', '27,33,145', '14,17,72']],
  ['accent-strong', '#03616D', ['39,133,160', '170,129,5']],
  ['accent', '#9ACED0', ['174,200,214', '255,194,7', '255,203,5', '242,223,127', '249,236,0', '58,199,240', '137,141,230']],
  ['lagoon', '#55B3BA', ['252,145,58']],
  ['sky', '#7EBBF1', ['104,154,222', '61,155,233']],
  ['ice', '#D3EAF1', ['211,234,240', '220,235,241', '187,236,250', '152,224,245', '163,217,246', '255,225,131', '177,180,242']],
  ['accent-soft', '#E3F2F3', ['255,239,220', '255,235,172', '229,242,246']],
  ['muted', '#EDF7F9', ['244,246,248', '243,247,244', '244,247,248', '251,243,209', '255,242,214']],
];
const VAR_RGB = { primary: 'primary-rgb', foreground: 'foreground-rgb', 'accent-strong': 'accent-strong-rgb', accent: 'accent-rgb', lagoon: null, sky: 'sky-rgb', ice: 'ice-rgb', 'accent-soft': 'accent-soft-rgb', muted: 'muted-rgb' };
const rgbOf = (hex) => hex.slice(1).match(/../g).map((h) => parseInt(h, 16)).join(',');
const hexOf = (rgb) => '#' + rgb.split(',').map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
const triplet = (rgb) => new RegExp(`(?<![\\d.])${rgb.split(',').join('\\s*,\\s*')}(?![\\d.])`, 'g');
const hexRe = (hex) => new RegExp(`${hex}(?![0-9a-f])`, 'gi');

const FONT_MAP = [
  [/\bpoppins-v2\b|\bpoppins-semibold\b|\bpoppins-extralight\b/gi, 'var(--font-heading)'],
  [/\bopen-sans-v2\b|\bavenir-lt-w01_[\w-]+\b|\bdin-next-w01-light\b|\bmadefor-[\w-]+\b|\bhelvetica-w01-[\w-]+\b/gi, 'var(--font-body)'],
];

function swapFonts(text) {
  return FONT_MAP.reduce((out, [re, to]) => out.replace(re, to), text);
}

// CSS can reference the live custom properties, so seasonal themes can override them later.
export function brandCss(css = '') {
  let out = swapFonts(css);
  for (const [token, hex, sources] of COLOR_MAP) {
    for (const rgb of sources) {
      const rgbVar = VAR_RGB[token];
      out = out.replace(triplet(rgb), rgbVar ? `var(--${rgbVar})` : rgbOf(hex));
      out = out.replace(hexRe(hexOf(rgb)), `var(--${token})`);
    }
  }
  return out;
}

// HTML attributes (SVG fill="", inline styles) get literal brand hex values,
// because presentation attributes do not resolve CSS custom properties.
export function brandHtml(html = '') {
  let out = swapFonts(html);
  for (const [, hex, sources] of COLOR_MAP) {
    const rgbLiteral = rgbOf(hex);
    for (const rgb of sources) {
      out = out.replace(triplet(rgb), rgbLiteral);
      out = out.replace(hexRe(hexOf(rgb)), hex);
    }
  }
  return out;
}

export function contrastRatio(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
