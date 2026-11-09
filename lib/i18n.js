import dictionary from '../content/i18n/site.json';
export const locales=['en','zh-Hant','es'];
export const localePaths={en:'en','zh-Hant':'zh',es:'es'};
// URL prefix per language. English (the default) has no prefix, like Wix: /our-centers/, /zh/our-centers/.
export const localePrefixes={en:'','zh-Hant':'/zh',es:'/es'};
export function localePrefix(locale){return localePrefixes[locale]??''}
// HTML lang attribute. Same code as hreflang (zh-Hant). Noto Sans TC is loaded
// explicitly for Chinese (--font-zh), so no regional code is needed for font choice.
export function htmlLang(locale){return locale;}
// English wording fixes for labels repeated in every exported Wix page (header, footer, buttons). Applied to English
// output and before the dictionary lookup, so Chinese/Spanish still find their translation.
export const EN_FIXES={'Our Center':'Our Centers','Find A Center':'Find a Center','View Opening':'View Openings'};
function fixEnglish(text){const trimmed=text.trim();return EN_FIXES[trimmed]?text.replace(trimmed,EN_FIXES[trimmed]):text}
export function translate(text,locale='en'){if(typeof text!=='string')return text;if(text.includes(' | '))return text.split(' | ').map(part=>translate(part,locale)).join(' | ');text=fixEnglish(text);if(locale==='en')return text;const trimmed=text.trim();return dictionary[trimmed]?.[locale]?text.replace(trimmed,dictionary[trimmed][locale]):text}
export function localizedRecord(record,locale){if(!record||locale==='en')return record;const translation=record.translations?.[locale]||{};const result={...record};for(const field of ['name','title','bio','summary','bodyHtml','body']){if(translation[field]?.trim())result[field]=translation[field];else if(record[field])result[field]=translate(record[field],locale)}return result}
