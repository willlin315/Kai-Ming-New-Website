import { basePath } from './client-routes';
export function safeImage(value) {
  if (typeof value !== 'string') return undefined;
  if (/^https:\/\//i.test(value) || /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value;
  if (/^\/(?!\/)/.test(value)) return value.startsWith('/media/') ? `${basePath}${value}` : value;
}
export async function imageFromFile(file) {
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 10*1024*1024) throw Error('Choose a JPG, PNG, WebP or GIF under 10 MB.');
  const url=URL.createObjectURL(file);
  try { const image=new Image(); image.src=url; await image.decode(); const scale=Math.min(1,1400/image.width,1400/image.height); const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.82); } finally {URL.revokeObjectURL(url)}
}
