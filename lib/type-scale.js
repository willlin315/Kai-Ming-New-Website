// Phone type scale (750px and below). The Wix mobile sizes in content/mobile-typography.json grow with the screen
// (clamp(min, Nvw, max)), so the same text was 15px on one phone and 20px on another, and body copy (18-19.5px on a
// 390px phone) ended up bigger than on desktop. Here every size becomes fixed:
//   body copy 16px, small print 14px, page titles (h1) 36px, section headings 28px, card titles keep their size.
// Line heights keep their original ratio to the font size.
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const CLAMP = /clamp\(([\d.]+)px,[^,]+,[^)]+\)/;
function phoneSize(selector, min) {
  const tag = (selector.match(/>\s*(h[1-6]|p|li|span|a)\b/) || [])[1] || 'p';
  if (tag === 'h1') return 36;
  if (/^h[2-6]$/.test(tag)) return min >= 24 ? 28 : min;
  if (min >= 24) return 28;   // large paragraph text used as a heading
  if (min >= 18) return min;  // lead text / subtitles
  if (min >= 15) return 16;   // body copy
  return 14;                  // small print
}
export function phoneTypeScale(css) {
  return css.replace(RULE, (rule, selector, body) => {
    const font = body.match(new RegExp(`font-size:${CLAMP.source}`));
    if (!font) return rule.replace(/clamp\(([\d.]+)px,[^,]+,[^)]+\)/g, '$1px');
    const min = parseFloat(font[1]);
    const size = phoneSize(selector, min);
    let next = body.replace(new RegExp(`font-size:${CLAMP.source}`), `font-size:${size}px`);
    next = next.replace(new RegExp(`line-height:${CLAMP.source}`), (m, lh) => `line-height:${Math.round((parseFloat(lh) / min) * size * 10) / 10}px`);
    next = next.replace(/clamp\(([\d.]+)px,[^,]+,[^)]+\)/g, '$1px');
    return `${selector}{${next}}`;
  });
}
