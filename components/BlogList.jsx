'use client';
import {translate,localizedRecord,localePaths} from '../lib/i18n';
import {useEffect,useState} from 'react';
import {basePath} from '../lib/client-routes';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {safeImage} from '../lib/cms-media';

export default function BlogList({locale='en'}){
 const [posts,setPosts]=useState([]);
 const [state,setState]=useState('loading');
 useEffect(()=>{
  const url=publicApiUrl();
  if(!url){setState('unavailable');return;}
  let active=true;
  requestCms(url,'/public/posts').then(items=>{
   if(!active)return;
   if(!Array.isArray(items)){setState('unavailable');return;}
   setPosts(items.filter(item=>item?.slug));
   setState('ready');
  }).catch(()=>{if(active)setState('unavailable');});
  return()=>{active=false};
 },[]);
 if(state==='loading')return <div className="km-news-list"><p role="status">Loading stories…</p></div>;
 if(state==='unavailable')return <div className="km-news-list"><p role="status">{locale==='zh-Hant'?'暫時無法取得文章，請稍後再試。':locale==='es'?'No se pueden cargar las historias en este momento.':'Stories are temporarily unavailable. Please try again later.'}</p></div>;
 if(posts.length===0)return <div className="km-news-list"><p>{locale==='zh-Hant'?'目前沒有已發佈文章。':locale==='es'?'Todavía no hay historias publicadas.':'No published stories yet.'}</p></div>;
 return <div className="km-news-list">{posts.map(raw=>{
  const post=localizedRecord(raw,locale);
  const image=safeImage(post.image?.replaceAll('__BASE__',basePath));
  const href=`${basePath}/${localePaths[locale]}/story/?slug=${encodeURIComponent(raw.slug)}&sourceLanguage=${encodeURIComponent(raw.language||'en')}`;
  return <article key={raw.id||raw.slug} className="km-news-card">
   {image&&<img src={image} alt={post.title||''} width="454" height="341"/>}
   <div className="km-news-card-content"><h2>{post.title}</h2>{post.summary&&<p>{post.summary}</p>}<a href={href}>{translate('Read more',locale)}</a></div>
  </article>;
 })}</div>;
}
