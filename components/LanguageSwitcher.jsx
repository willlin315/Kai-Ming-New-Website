'use client';
import {useEffect} from 'react';
import {basePath} from '../lib/client-routes';
import {localePrefix,htmlLang} from '../lib/i18n';
export default function LanguageSwitcher({locale='en',pageKey='home',story=false,storySlug=''}){
 useEffect(()=>{document.documentElement.lang=htmlLang(locale)},[locale]);
 function switchTo(event,code){if(!story){if(new URLSearchParams(window.location.search).get('cmsPreview')==='1'){event.preventDefault();window.location.assign(event.currentTarget.href+'?cmsPreview=1')}return;}event.preventDefault();const params=new URLSearchParams(window.location.search);params.delete('language');window.location.assign(`${basePath}${localePrefix(code)}/story/?${params}`)}
 return <nav className="km-language-switcher" aria-label="Website language">{[['en','English'],['zh-Hant','繁體中文'],['es','Español']].map(([code,label])=><a key={code} href={`${basePath}${localePrefix(code)}/${storySlug?`stories/${storySlug}/`:story?'story/':pageKey==='home'?'':pageKey+'/'}`} lang={htmlLang(code)} hrefLang={code} aria-current={locale===code?'page':undefined} onClick={e=>switchTo(e,code)}>{label}</a>)}</nav>
}
