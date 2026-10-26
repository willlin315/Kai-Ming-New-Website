'use client';
import {translate,localizedRecord,localePaths,localePrefix} from '../lib/i18n';
import {useEffect,useState} from 'react';
import {basePath} from '../lib/client-routes';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {safeImage} from '../lib/cms-media';
import {SLUG_PATTERN,slugify} from '../lib/slug';

// initialPosts are rendered into the static HTML at build time; the browser
// then refreshes the list from the public API when it is reachable.
export default function BlogList({locale='en',initialPosts=null}){
 const [posts,setPosts]=useState(initialPosts||[]);
 const [state,setState]=useState(initialPosts?'ready':'loading');
 useEffect(()=>{
  const url=publicApiUrl();
  if(!url){if(!initialPosts)setState('unavailable');return;}
  let active=true;
  requestCms(url,'/public/posts').then(items=>{
   if(!active)return;
   if(!Array.isArray(items)){if(!initialPosts)setState('unavailable');return;}
   setPosts(items.map(item=>item&&!item.slug?{...item,slug:slugify(item.title,item.id)}:item).filter(item=>SLUG_PATTERN.test(item?.slug||'')));
   setState('ready');
  }).catch(()=>{if(active&&!initialPosts)setState('unavailable');});
  return()=>{active=false};
 },[initialPosts]);
 if(state==='loading')return <div className="km-news-list"><p role="status">Loading stories…</p></div>;
 if(state==='unavailable')return <div className="km-news-list"><p role="status">{locale==='zh-Hant'?'暫時無法取得文章，請稍後再試。':locale==='es'?'No se pueden cargar las historias en este momento.':'Stories are temporarily unavailable. Please try again later.'}</p></div>;
 if(posts.length===0)return <div className="km-news-list"><p>{locale==='zh-Hant'?'目前沒有已發佈文章。':locale==='es'?'Todavía no hay historias publicadas.':'No published stories yet.'}</p></div>;
 return <div className="km-news-list">{posts.map(raw=>{
  const post=localizedRecord(raw,locale);
  const image=safeImage(post.image?.replaceAll('__BASE__',basePath));
  const href=`${basePath}${localePrefix(locale)}/stories/${encodeURIComponent(raw.slug)}/`;
  return <article key={raw.id||raw.slug} className="km-news-card">
   {image&&<img src={image} alt={post.title||''} width="454" height="341"/>}
   <div className="km-news-card-content"><h2>{post.title}</h2>{post.summary&&<p>{post.summary}</p>}<a href={href}>{translate('Read more',locale)}</a></div>
  </article>;
 })}</div>;
}
