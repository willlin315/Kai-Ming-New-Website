export function validApiUrl(value) {
  try { const url=new URL(value); return !url.username&&!url.password&&!url.search&&!url.hash&&(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))) ? url.href.replace(/\/$/,'') : ''; } catch {return ''}
}
// The CMS API is served by this site at /api/cms (same origin, no separate backend).
export function publicApiUrl() {
  if (typeof window === 'undefined') return '';
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return validApiUrl(`${window.location.origin}${base}/api/cms`);
}
// The site uses trailingSlash, so API paths end with '/' to avoid a 308 redirect.
export function cmsPath(path) {
  const [route, query] = String(path).split(/\?(.*)/s);
  return `${route.endsWith('/') ? route : `${route}/`}${query ? `?${query}` : ''}`;
}
export async function requestCms(url,path,token,body,method='GET') {
 const response=await fetch(`${url}${cmsPath(path)}`,{method,cache:'no-store',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json().catch(()=>null);
 if(!response.ok)throw Error(typeof data?.detail==='string'?data.detail:`CMS request failed (${response.status}).`);
 return data;
}
