'use client';
import LanguageSwitcher from './LanguageSwitcher';
import {localizedRecord,localePaths} from '../lib/i18n';
import {useEffect,useState} from 'react';
import RichContent from './RichContent';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {safeImage} from '../lib/cms-media';
import {basePath} from '../lib/client-routes';
import legacyPosts from '../content/blog-posts.json';

const labels={
 en:{back:'All stories',share:'Share this story',copy:'Copy link',copied:'Link copied',related:'Recent Posts',seeAll:'See All',read:'Read story',views:'views',previous:'Previous story',next:'Next story'},
 'zh-Hant':{back:'所有文章',share:'分享文章',copy:'複製連結',copied:'已複製連結',related:'最新文章',seeAll:'查看全部',read:'閱讀文章',views:'次觀看',previous:'上一篇',next:'下一篇'},
 es:{back:'Todas las historias',share:'Compartir historia',copy:'Copiar enlace',copied:'Enlace copiado',related:'Publicaciones recientes',seeAll:'Ver todas',read:'Leer historia',views:'vistas',previous:'Anterior',next:'Siguiente'}
};
function storyUrl(item,locale){return item.slug?`${basePath}/${localePaths[locale]}/story/?slug=${encodeURIComponent(item.slug)}&sourceLanguage=${encodeURIComponent(item.language||'en')}`:(item.href||item.sourceUrl||`${basePath}/${localePaths[locale]}/blog/`);}
function Icon({name}) {
 const shared={fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round'};
 return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" {...shared}>{name==='share'?<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.3M8.7 13.3l6.6 4.3"/></>:name==='copy'?<><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>:<><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/></>}</svg>;
}
export default function PublishedArticle({locale='en'}){
 const [post,setPost]=useState(null),[allPosts,setAllPosts]=useState([]),[message,setMessage]=useState('Loading story…'),[copied,setCopied]=useState(false),[shareUrl,setShareUrl]=useState('');
 const t=labels[locale]||labels.en;
 useEffect(()=>{
  const url=publicApiUrl(),params=new URLSearchParams(window.location.search),slug=params.get('slug');
  if(!url||!slug){setMessage('This story is not available.');return;}
  let active=true;
  setShareUrl(window.location.href);
  const language=params.get('sourceLanguage')||'en';
  requestCms(url,`/public/posts/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}`).then(item=>{
   if(active){const localized=localizedRecord(item,locale);setPost(localized);document.title=localized.title+' | Kai Ming Head Start';}
  }).catch(()=>{if(active)setMessage('This story is not available.');});
  requestCms(url,'/public/posts').then(items=>{if(active&&Array.isArray(items))setAllPosts(items);}).catch(()=>{});
  return()=>{active=false};
 },[locale]);
 const share=()=>{
  if(typeof window==='undefined')return;
  const url=window.location.href;
  if(navigator.share){navigator.share({title:post?.title||'Kai Ming Head Start',url}).catch(()=>{});return;}
  copy();
 };
 const copy=()=>{if(typeof window==='undefined')return;const url=window.location.href;if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url).then(()=>setCopied(true)).catch(()=>{});}};
 const normalizeTitle=value=>(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const ordered=[...allPosts,...legacyPosts.filter(old=>!allPosts.some(item=>normalizeTitle(item.title)===normalizeTitle(old.title)))].filter(p=>p.slug||p.href||p.sourceUrl);
 const currentIndex=ordered.findIndex(p=>p.slug===post?.slug);
 const recommendations=ordered.filter(p=>p.slug? p.slug!==post?.slug:normalizeTitle(p.title)!==normalizeTitle(post?.title)).slice(0,2);
 const previous=currentIndex>0?ordered[currentIndex-1]:null;
 const next=currentIndex>=0&&currentIndex<ordered.length-1?ordered[currentIndex+1]:null;
 const date=post?.publishedAt||post?.published_at||post?.date||post?.createdAt;
 const formattedDate=date&&!Number.isNaN(new Date(date).getTime())?new Intl.DateTimeFormat(locale==='zh-Hant'?'zh-TW':locale,{year:'numeric',month:'long',day:'numeric'}).format(new Date(date)):null;
 return <main lang={locale} className="km-published-article">
  <LanguageSwitcher locale={locale} story/>
  <a className="km-story-back" href={`${basePath}/${localePaths[locale]}/blog/`}>← {t.back}</a>
  {post?<article className="km-story-layout">
   <header className="km-story-header">
    <p className="km-story-eyebrow">KAI MING / NEWS & STORIES</p>
    <h1>{post.title}</h1>
    <div className="km-story-meta">
     <span>{post.author||'Kai Ming Head Start'}{formattedDate?' · '+formattedDate:''}</span>
    </div>
   </header>
   {safeImage(post.image)&&<img className="km-article-cover" src={safeImage(post.image)} alt={post.title}/>}
   {post.summary&&<p className="km-story-summary">{post.summary}</p>}
   <RichContent html={post.bodyHtml||post.body||''}/>
   <footer className="km-story-footer">
    <strong>{t.share}</strong>
    <div className="km-story-share-actions">
     <button type="button" onClick={share}><Icon name="share"/>{t.share}</button>
     <button type="button" onClick={copy}><Icon name="copy"/>{copied?t.copied:t.copy}</button>
     <a aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">Facebook ↗</a>
     <a aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
    </div>
   </footer>
   {(previous||next)&&<nav className="km-story-pager" aria-label="Story navigation">
    {previous?<a href={storyUrl(previous,locale)}><small>← {t.previous}</small><span>{localizedRecord(previous,locale).title}</span></a>:<span/>}
    {next?<a href={storyUrl(next,locale)}><small>{t.next} →</small><span>{localizedRecord(next,locale).title}</span></a>:<span/>}
   </nav>}
   <section className="km-story-related km-recent-posts" aria-label={t.related}>
    <div className="km-recent-heading"><h2>{t.related}</h2><a href={`${basePath}/${localePaths[locale]}/blog/`}>{t.seeAll}</a></div>
    {recommendations.length>0?<div className="km-story-related-grid">{recommendations.map(item=>{
     const translated=localizedRecord(item,locale);
     const image=safeImage(item.image?.replaceAll('__BASE__',basePath));
     return <a className="km-recent-card" href={storyUrl(item,locale)} key={item.id||item.slug}>
      {image?<img src={image} alt="" loading="lazy"/>:<div className="km-recent-placeholder" aria-hidden="true"/>}
      <div className="km-recent-card-content"><h3>{translated.title}</h3>
       <div className="km-recent-card-stats">
        <span className="km-recent-read">{t.read} →</span>
       </div>
      </div>
     </a>;
    })}</div>:<p className="km-recent-empty">{locale==='zh-Hant'?'目前沒有其他已發佈文章。':locale==='es'?'No hay otras historias publicadas.':'No other published stories yet.'}</p>}
   </section>
  </article>:<p role="status">{message}</p>}
 </main>;
}
