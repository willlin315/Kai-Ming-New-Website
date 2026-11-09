import {annotateHome} from './home-fields';
import {parseDocument} from 'htmlparser2';
import render from 'dom-serializer';
import {translate,localePaths,EN_FIXES} from './i18n';
const EN_FIX_RE=new RegExp(`>(\\s*)(${Object.keys(EN_FIXES).join('|')})(\\s*)<`,'g');
export function localizeHtml(html,locale,home=false){
 if(locale==='en'&&!home)return html.replace(EN_FIX_RE,(m,a,t,b)=>`>${a}${EN_FIXES[t]}${b}<`);
 const tree=parseDocument(html,{decodeEntities:true});
 if(home)annotateHome(tree);
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
