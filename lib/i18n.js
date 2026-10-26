import dictionary from '../content/i18n/site.json';
export const locales=['en','zh-Hant','es'];
export const localePaths={en:'en','zh-Hant':'zh',es:'es'};
// HTML lang attribute. Same code as hreflang (zh-Hant). Noto Sans TC is loaded
// explicitly for Chinese (--font-zh), so no regional code is needed for font choice.
export function htmlLang(locale){return locale;}
export function translate(text,locale='en'){if(typeof text!=='string'||locale==='en')return text;if(text.includes(' | '))return text.split(' | ').map(part=>translate(part,locale)).join(' | ');const trimmed=text.trim();return dictionary[trimmed]?.[locale]?text.replace(trimmed,dictionary[trimmed][locale]):text}
export function localizedRecord(record,locale){if(!record||locale==='en')return record;const translation=record.translations?.[locale]||{};const result={...record};for(const field of ['name','title','bio','summary','bodyHtml','body']){if(translation[field]?.trim())result[field]=translation[field];else if(record[field])result[field]=translate(record[field],locale)}return result}
