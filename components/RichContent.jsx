import parse, { domToReact } from 'html-react-parser';
import { safeImage } from '../lib/cms-media';
const tags=new Set(['p','div','span','br','strong','b','em','i','u','s','h2','h3','h4','ul','ol','li','blockquote','a','img','font']);
const sizes={'1':'12px','2':'14px','3':'16px','4':'18px','5':'24px','6':'32px','7':'40px'};
export default function RichContent({html}) {
 const options={replace(node){if(node.type!=='tag')return;if(!tags.has(node.name))return <></>;const attrs=node.attribs||{};const style={};const size=attrs.style?.match(/(?:^|;)\s*font-size\s*:\s*(12|14|16|18|20|24|28|32|36|40)px\s*(?:;|$)/i)?.[1];if(size)style.fontSize=`${size}px`;if(node.name==='font'&&sizes[attrs.size])style.fontSize=sizes[attrs.size];const align=attrs.style?.match(/text-align\s*:\s*(left|center|right)/i)?.[1];if(align)style.textAlign=align;
 if(node.name==='img'){const src=safeImage(attrs.src);return src?<img src={src} alt={attrs.alt||''} loading="lazy"/>:<></>}
 if(node.name==='a'){const href=/^(https?:\/\/|mailto:)/i.test(attrs.href||'')?attrs.href:undefined;return <a href={href} rel="noopener noreferrer">{domToReact(node.children,options)}</a>}
 const Tag=node.name==='font'?'span':node.name;return <Tag style={style}>{node.children?.length?domToReact(node.children,options):undefined}</Tag>}};
 return <div className="cms-rich-content">{parse(html||'',options)}</div>
}
