'use client';
import {useEffect,useState} from 'react';
import RichContent from './RichContent';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {safeImage} from '../lib/cms-media';
import {basePath} from '../lib/client-routes';
export default function PublishedArticle(){
 const [post,setPost]=useState(null),[message,setMessage]=useState('Loading story…');
 useEffect(()=>{const url=publicApiUrl(),params=new URLSearchParams(window.location.search),slug=params.get('slug');if(!url||!slug){setMessage('This story is not available.');return}let active=true;requestCms(url,`/public/posts/${encodeURIComponent(slug)}?language=${encodeURIComponent(params.get('language')||'en')}`).then(p=>{if(active){setPost(p);document.title=p.title+' | Kai Ming Head Start'}}).catch(()=>{if(active)setMessage('This story is not available.')});return()=>{active=false}},[]);
 return <main className="km-published-article"><a href={`${basePath}/en/blog/`}>Back to stories</a>{post?<article><h1>{post.title}</h1>{safeImage(post.image)&&<img className="km-article-cover" src={safeImage(post.image)} alt={post.title}/>}<p>{post.summary}</p><RichContent html={post.bodyHtml||post.body||''}/></article>:<p role="status">{message}</p>}</main>
}
