// Adapt the retained Wix markup without duplicating page content or form state.
const tags = (nodes = []) => nodes.filter((node) => node.type === 'tag');
const text = (node) => node.type === 'text' ? node.data : (node.children || []).map(text).join('');
const find = (nodes, predicate) => {
  for (const node of tags(nodes)) {
    if (predicate(node)) return node;
    const found = find(node.children, predicate);
    if (found) return found;
  }
};
export function navigationFromNodes(nodes) {
  const nav = find(nodes, (node) => node.name === 'nav');
  const list = nav && find(nav.children, (node) => node.name === 'ul');
  return tags(list?.children).filter((node) => node.name === 'li' && !node.attribs.id?.includes('__more__')).map((node) => {
    const trigger = tags(node.children).find((child) => child.name === 'a' || child.attribs.role === 'button');
    const submenu = tags(node.children).find((child) => child.name === 'ul');
    return { label: trigger ? text(trigger).trim() : '', href: trigger?.attribs.href,
      links: tags(submenu?.children).map((item) => find([item], (child) => child.name === 'a')).filter(Boolean).map((link) => ({label:text(link).trim(), href:link.attribs.href})) };
  }).filter((group) => group.label);
}
export function markResponsiveNode(node) {
  const classes = (node.attribs.class || '').split(/\s+/);
  const add = (value) => { node.attribs.class = `${node.attribs.class || ''} ${value}`.trim(); };
  if (node.attribs['data-testid'] === 'mesh-container-content') {
    for (const child of tags(node.children)) {
      child.attribs['data-responsive-item'] = '';
      // Empty Wix boxes are backplates positioned behind neighboring content.
      // Remove only these decorations from the narrow-screen document flow.
      if (child.name === 'div' && !text(child).trim() &&
          find(child.children, (item) => (item.attribs.class || '').split(/\s+/).includes('wixui-box')) &&
          !find(child.children, (item) => ['img','iframe','svg','video','a','button','input'].includes(item.name))) {
        child.attribs['data-responsive-decoration'] = '';
      }
    }
    if (!tags(node.children).length) add('km-empty-layout');
  }
  if (classes.includes('wixui-section') && !text(node).trim() &&
      !find(node.children, (item) => ['img','iframe','a','button'].includes(item.name))) add('km-background-section');
  if (classes.includes('wixui-column-strip__column') && !text(node).trim()) add('km-background-column');
  if (classes.includes('wixui-image')) {
    const image = find(node.children, (item) => item.name === 'img');
    if (image && Number(image.attribs.width) > 0 && Number(image.attribs.width) <= 160) add('km-small-image');
  }
}
