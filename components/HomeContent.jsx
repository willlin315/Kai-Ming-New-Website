'use client';
import {createContext,useContext,useEffect,useState} from 'react';
import homeSeed from '../content/home-content.json';
import {publicApiUrl,requestCms} from '../lib/cms-api';
import {CMS_KEY} from '../lib/cms-store';
import {safeImage} from '../lib/cms-media';
const HomeContext=createContext({record:homeSeed,locale:'en'});
export function HomeContentProvider({locale,children}){
 const [record,setRecord]=useState(homeSeed);
 useEffect(()=>{
  if(new URLSearchParams(window.location.search).get('cmsPreview')==='1'){
   const load=()=>{try{const remote=JSON.parse(localStorage.getItem('km-cms-db-preview')||'null');const local=JSON.parse(localStorage.getItem(CMS_KEY)||'null');const source=remote?.url===localStorage.getItem('km-cms-api-url')?remote.data:local;const page=source?.pages?.find(p=>p.id==='home');if(page?.values)setRecord(page)}catch{}};
   load();window.addEventListener('storage',load);return()=>window.removeEventListener('storage',load);
  }
  const url=publicApiUrl();if(url)requestCms(url,'/public/pages').then(items=>{const page=items?.find(p=>p.id==='home');if(page?.values)setRecord(page)}).catch(()=>{});
 },[]);
 return <HomeContext.Provider value={{record,locale}}>{children}</HomeContext.Provider>;
}
export function HomeText({field}){const {record,locale}=useContext(HomeContext);const value=record.values?.[field];return <>{typeof value?.[locale]==='string'?value[locale]:value?.en??homeSeed.values[field]?.[locale]??''}</>}
export function HomeImage({field,attributes}){const {record}=useContext(HomeContext);const value=record.values?.[field]||homeSeed.values[field];const src=safeImage(value?.src);return <img {...attributes} src={src||attributes.src} srcSet={undefined} alt={value?.alt??attributes.alt} style={{...attributes.style,objectPosition:value?.position||'50% 50%'}}/>}
