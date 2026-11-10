'use client';
import {useEffect,useState} from 'react';
import {basePath} from '../lib/client-routes';
import {localePrefix,htmlLang} from '../lib/i18n';
import {announcementFrom} from '../lib/announcement';
import {CMS_KEY} from '../lib/cms-store';
// Top bar: the CMS announcement (centred) and the language links (right).
export default function LanguageSwitcher({locale='en',pageKey='home',story=false,storySlug='',announcement=null}){
 const [notice,setNotice]=useState(announcement);
 useEffect(()=>{document.documentElement.lang=htmlLang(locale)},[locale]);
 useEffect(()=>setNotice(announcement),[announcement?.text,announcement?.href]);
 // CMS preview (?cmsPreview=1): show the saved Home draft's announcement.
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('cmsPreview')!=='1')return;const load=()=>{try{const remote=JSON.parse(localStorage.getItem('km-cms-db-preview')||'null');const local=JSON.parse(localStorage.getItem(CMS_KEY)||'null');const source=remote?.url===localStorage.getItem('km-cms-api-url')?remote.data:local;const page=source?.pages?.find(p=>p.id==='home');if(page?.values)setNotice(announcementFrom(page,locale))}catch{}};load();window.addEventListener('storage',load);return()=>window.removeEventListener('storage',load)},[locale]);
 function switchTo(event,code){if(!story){if(new URLSearchParams(window.location.search).get('cmsPreview')==='1'){event.preventDefault();window.location.assign(event.currentTarget.href+'?cmsPreview=1')}return;}event.preventDefault();const params=new URLSearchParams(window.location.search);params.delete('language');window.location.assign(`${basePath}${localePrefix(code)}/story/?${params}`)}
 const external=/^(?:https?:)?\/\//i.test(notice?.href||'');
 return <div className="km-topbar">{notice?.text?<p className="km-announcement">{notice.href?<a href={notice.href} {...(external?{target:'_blank',rel:'noopener'}:{})}>{notice.text}</a>:notice.text}</p>:null}<nav className="km-language-switcher" aria-label="Website language">{[['en','English'],['zh-Hant','繁體中文'],['es','Español']].map(([code,label])=><a key={code} href={`${basePath}${localePrefix(code)}/${storySlug?`stories/${storySlug}/`:story?'story/':pageKey==='home'?'':pageKey+'/'}`} lang={htmlLang(code)} hrefLang={code} aria-current={locale===code?'page':undefined} onClick={e=>switchTo(e,code)}>{label}</a>)}</nav></div>
}
