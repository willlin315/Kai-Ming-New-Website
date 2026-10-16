'use client';
import {useEffect,useState} from 'react';
import initialPosts from '../content/blog-posts.json';
import {basePath} from '../lib/client-routes';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {safeImage} from '../lib/cms-media';
export default function BlogList(){
 const [posts,setPosts]=useState(initialPosts);
 useEffect(()=>{const url=publicApiUrl();if(!url)return;let active=true;requestCms(url,'/public/posts').then(items=>{if(active&&Array.isArray(items))setPosts(items)}).catch(()=>{});return()=>{active=false}},[]);
 return <div className="km-news-list">{posts.map(post=><article key={post.id||post.title} className="km-news-card">{safeImage(post.image?.replaceAll('__BASE__',basePath))&&<img src={safeImage(post.image.replaceAll('__BASE__',basePath))} alt={post.title} width="454" height="341"/>}<div className="km-news-card-content"><h2>{post.title}</h2>{post.summary&&<p>{post.summary}</p>}<a href={post.slug?`${basePath}/en/story/?slug=${encodeURIComponent(post.slug)}&language=${encodeURIComponent(post.language||'en')}`:post.href||post.sourceUrl}>Read story</a></div></article>)}</div>
}
