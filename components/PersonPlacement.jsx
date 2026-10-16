'use client';
import {useEffect,useState} from 'react';
import parse,{attributesToProps,domToReact} from 'html-react-parser';
import {readPeopleDrafts} from '../lib/cms-store';
import {markResponsiveNode} from '../lib/responsive';
import {safeImage} from '../lib/cms-media';
export default function PersonPlacement({person,placement,attributes,html}){
 const [record,setRecord]=useState(person);
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('cmsPreview')!=='1')return;const load=()=>{const found=readPeopleDrafts()?.find(p=>p.id===person.id);if(found)setRecord(found)};load();window.addEventListener('storage',load);return()=>window.removeEventListener('storage',load)},[person.id]);
 const options={replace(node){if(node.type!=='tag')return;markResponsiveNode(node);const field=placement.fields[node.attribs.id];if(field){const inner={replace(child){if(child.type!=='tag')return;if(['p','h2','h3','h4','h5','h6'].includes(child.name)){const Tag=child.name;return <Tag {...attributesToProps(child.attribs)}>{field==='email'?<a href={`mailto:${record.email}`}>{record.email}</a>:field==='phone'?<a href={`tel:${record.phone}`}>{record.phone}</a>:record[field]}</Tag>}}};return <div {...attributesToProps(node.attribs)}>{domToReact(node.children,inner)}</div>}
 if(node.name==='img')return <img {...attributesToProps(node.attribs)} src={safeImage(record.photo)} alt={record.name}/>;
 if(node.name==='a'&&/^(mailto:|tel:)/.test(node.attribs.href||'')){const email=node.attribs.href.startsWith('mailto:');return <a {...attributesToProps(node.attribs)} href={email?`mailto:${record.email}`:`tel:${record.phone}`}>{domToReact(node.children,options)}</a>}
 }};
 return <div {...attributes}>{parse(html,options)}</div>
}
