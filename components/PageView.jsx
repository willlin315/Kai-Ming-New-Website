import parse, { attributesToProps, domToReact } from 'html-react-parser';
import render from 'dom-serializer';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import Gallery from './Gallery';
import Interactions from './Interactions';
import BlogList from './BlogList';
import Tabs from './Tabs';
import EligibilityBridge from './EligibilityBridge';

export default function PageView({ page }) {
  const options = {
    replace(node) {
      if (node.type !== 'tag') return;
      if ((node.attribs?.class || '').split(/\s+/).includes('wixui-tabs')) {
        const descendants = [];
        const walk = (nodes) => nodes.forEach((child) => {
          if (child.type === 'tag') descendants.push(child);
          if (child.children) walk(child.children);
        });
        walk(node.children);
        const tabNodes = descendants.filter((child) => child.attribs?.role === 'tab');
        const panelNodes = descendants.filter((child) => child.attribs?.role === 'tabpanel');
        const list = descendants.find((child) => child.attribs?.role === 'tablist');
        const menu = node.children.find((child) => (child.attribs?.class || '').split(/\s+/).includes('wixui-tabs__menu-container'));
        const container = node.children.find((child) => (child.attribs?.class || '').split(/\s+/).includes('wixui-tabs__container'));
        if (tabNodes.length && list && menu && container && panelNodes.length === tabNodes.length) {
          return <Tabs rootAttributes={attributesToProps(node.attribs)} menuAttributes={attributesToProps(menu.attribs)}
            listAttributes={attributesToProps(list.attribs)} containerAttributes={attributesToProps(container.attribs)}
            items={tabNodes.map((tab) => {
              const panel = panelNodes.find((candidate) => candidate.attribs['aria-labelledby'] === tab.attribs.id);
              return { tabAttributes: attributesToProps(tab.attribs), panelAttributes: attributesToProps(panel.attribs),
                label: domToReact(tab.children, options), content: domToReact(panel.children, options) };
            })} />;
        }
      }
      if (node.name === 'km-site-header' || node.name === 'km-site-footer') {
        const Component = node.name === 'km-site-header' ? SiteHeader : SiteFooter;
        return <Component attributes={attributesToProps(node.attribs)} html={render(node.children)} />;
      }
      if (node.name === 'km-news-list') return <BlogList />;
      if (node.attribs?.['data-gallery']) {
        return <Gallery id={node.attribs.id} className={node.attribs.class} items={JSON.parse(node.attribs['data-gallery'])} />;
      }
    },
  };
  return <>
    <style dangerouslySetInnerHTML={{ __html: page.css }} />
    {parse(page.html, options)}
    <Interactions />
    <EligibilityBridge />
  </>;
}
