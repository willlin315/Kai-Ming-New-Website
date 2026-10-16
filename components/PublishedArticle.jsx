'use client';
import LanguageSwitcher from './LanguageSwitcher';
import {localizedRecord,localePaths} from '../lib/i18n';
import {useEffect,useState} from 'react';
import RichContent from './RichContent';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {safeImage} from '../lib/cms-media';
import {basePath} from '../lib/client-routes';
export default function PublishedArticle({locale='en'}){
 const [post,setPost]=useState(null),[message,setMessage]=useState('Loading story…');
 useEffect(()=>{const url=publicApiUrl(),params=new URLSearchParams(window.location.search),slug=params.get('slug');if(!url||!slug){setMessage('This story is not available.');return}let active=true;requestCms(url,`/public/posts/${encodeURIComponent(slug)}?language=${encodeURIComponent(params.get('sourceLanguage')||'en')}`).then(p=>{if(active){setPost(localizedRecord(p,locale));document.title=localizedRecord(p,locale).title+' | Kai Ming Head Start'}}).catch(()=>{if(active)setMessage('This story is not available.')});return()=>{active=false}},[locale]);
 return <main lang={locale} className="km-published-article"><LanguageSwitcher locale={locale} story/><a href={`${basePath}/${localePaths[locale]}/blog/`}>{locale==='zh-Hant'?'返回文章':locale==='es'?'Volver a las historias':'Back to stories'}</a>{post?<article><h1>{post.title}</h1>{safeImage(post.image)&&<img className="km-article-cover" src={safeImage(post.image)} alt={post.title}/>}<p>{post.summary}</p><RichContent html={post.bodyHtml||post.body||''}/></article>:<p role="status">{message}</p>}</main>
}
