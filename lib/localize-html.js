import {parseDocument} from 'htmlparser2';
import render from 'dom-serializer';
import {translate,localePaths} from './i18n';
export function localizeHtml(html,locale){
 if(locale==='en')return html;
 const tree=parseDocument(html,{decodeEntities:true});
 function walk(node){
  if(node.type==='style'||node.type==='script'||['style','script'].includes(node.name))return;
  if(node.type==='text')node.data=translate(node.data,locale);
  if(node.attribs){for(const key of ['alt','title','aria-label','placeholder'])if(node.attribs[key])node.attribs[key]=translate(node.attribs[key],locale);
   if(node.attribs.href?.includes('/en/'))node.attribs.href=node.attribs.href.replace('/en/',`/${localePaths[locale]}/`);
  }
  node.children?.forEach(walk);
 }
 tree.children.forEach(walk);return render(tree);
}
