import parse, { attributesToProps } from 'html-react-parser';
import render from 'dom-serializer';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import Gallery from './Gallery';
import Interactions from './Interactions';
import BlogList from './BlogList';

export default function PageView({ page }) {
  const options = {
    replace(node) {
      if (node.type !== 'tag') return;
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
  </>;
}
