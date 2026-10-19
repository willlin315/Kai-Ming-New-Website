// Field IDs belong to this fixed Home template; markup and links stay in code.
export function annotateHome(tree) {
 const fields=[];let textIndex=0,imageIndex=0,sectionIndex=0;
 const text=n=>n.type==='text'?n.data:(n.children||[]).map(text).join('');
 const heading=n=>{if(['h1','h2','h3'].includes(n.name))return text(n).trim();for(const c of n.children||[]){const h=heading(c);if(h)return h}return ''};
 function walk(n,inMain=false,group='Home',owner='home'){
  inMain=inMain||n.name==='main';owner=n.attribs?.id||owner;
  if(['script','style','svg'].includes(n.name))return;
  if(inMain&&n.name==='section')group=heading(n)||`Home section ${++sectionIndex}`;
  if(inMain&&n.type==='text'&&n.data.trim()){
   const id=`text-${textIndex++}`,value=n.data;fields.push({id,type:'text',group,label:value.trim().slice(0,100),value,owner});
   n.type='tag';n.name='km-home-text';n.attribs={'data-home-field':id};n.children=[{type:'text',data:value,parent:n}];delete n.data;return;
  }
  if(inMain&&n.name==='img'){
   const id=`image-${imageIndex++}`;n.attribs['data-home-field']=id;
   fields.push({id,type:'image',group,label:n.attribs.alt||'Section photo',value:n.attribs.src.replaceAll('__BASE__',''),alt:n.attribs.alt||'',owner});
  }
  n.children?.forEach(c=>walk(c,inMain,group,owner));
 }
 walk(tree);return fields;
}
