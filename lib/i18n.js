import dictionary from '../content/i18n/site.json';
export const locales=['en','zh-Hant','es'];
export const localePaths={en:'en','zh-Hant':'zh',es:'es'};
// HTML lang attribute. Chinese uses zh-HK like the Wix site, so browsers pick the
// same Traditional Chinese system font (zh-Hant alone can fall back to a Japanese CJK font).
export function htmlLang(locale){return locale==='zh-Hant'?'zh-HK':locale;}
export function translate(text,locale='en'){if(typeof text!=='string'||locale==='en')return text;if(text.includes(' | '))return text.split(' | ').map(part=>translate(part,locale)).join(' | ');const trimmed=text.trim();return dictionary[trimmed]?.[locale]?text.replace(trimmed,dictionary[trimmed][locale]):text}
export function localizedRecord(record,locale){if(!record||locale==='en')return record;const translation=record.translations?.[locale]||{};const result={...record};for(const field of ['name','title','bio','summary','bodyHtml','body']){if(translation[field]?.trim())result[field]=translation[field];else if(record[field])result[field]=translate(record[field],locale)}return result}
