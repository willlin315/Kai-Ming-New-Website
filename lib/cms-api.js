export function validApiUrl(value) {
  try { const url=new URL(value); return !url.username&&!url.password&&!url.search&&!url.hash&&(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))) ? url.href.replace(/\/$/,'') : ''; } catch {return ''}
}
export function publicApiUrl() {
  const configured=process.env.NEXT_PUBLIC_CMS_API_URL||'';
  if(configured)return validApiUrl(configured);
  if(typeof window!=='undefined'){try{return validApiUrl(localStorage.getItem('km-cms-api-url')||'')}catch{return ''}}
  return '';
}
export async function requestCms(url,path,token,body,method='GET') {
 const response=await fetch(`${url}${path}`,{method,cache:'no-store',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(typeof data?.detail==='string'?data.detail:`CMS request failed (${response.status}).`);
 return data;
}
