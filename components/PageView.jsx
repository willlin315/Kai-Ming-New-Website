import {HomeContentProvider,HomeText,HomeImage} from './HomeContent';
import {htmlLang,localePrefix} from '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';
import PersonPlacement from './PersonPlacement';
import peopleRecords from '../content/people.json';
import PeopleDirectory from './PeopleDirectory';
import parse, { attributesToProps, domToReact } from 'html-react-parser';
import render from 'dom-serializer';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import Gallery from './Gallery';
import Interactions from './Interactions';
import BoxFit from './BoxFit';
import BlogList from './BlogList';
import Tabs from './Tabs';
import CenterMap from './CenterMap';
import FormDropdown from './FormDropdown';
import enrollmentFields from '../content/enrollment-fields.json';
import { navigationFromNodes, markResponsiveNode } from '../lib/responsive';
import responsiveCss from '../content/responsive-css.json';
import mobileTypography from '../content/mobile-typography.json';
import EligibilityCalculator from './EligibilityCalculator';
import { brandCss } from '../lib/brand';
const brandedResponsiveCss = brandCss(responsiveCss);

// Home centers section: collect its CMS text fields (title, intro, 9 × name/program/address, button) and links.
function centerFields(node, locale) {
  const items = [];
  const walk = (n, href) => {
    if (n.type !== 'tag') return;
    const link = n.name === 'a' ? (n.attribs.href || '') : href;
    if (n.name === 'km-home-text') items.push({ field: n.attribs['data-home-field'], href: link });
    n.children?.forEach((c) => walk(c, link));
  };
  walk(node, '');
  if (items.length !== 30) return null;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const centers = [];
  for (let i = 2; i < 29; i += 3) centers.push({ name: items[i].field, program: items[i + 1].field, address: items[i + 2].field,
    href: items[i].href || `${base}${localePrefix(locale)}/dr-tkl-center/` });
  return { title: items[0].field, intro: items[1].field, centers, allLabel: items[29].field, allHref: items[29].href };
}

export default function PageView({ page }) {
  // page.people / page.posts / page.homeRecord are published CMS data fetched at build time.
  const people = page.people || peopleRecords;
  const options = {
    replace(node) {
      if (node.type !== 'tag') return;
      if(page.key==='home'&&node.name==='km-home-text')return <HomeText field={node.attribs['data-home-field']}/>;
      if(page.key==='home'&&node.name==='img'&&node.attribs['data-home-field'])return <HomeImage field={node.attribs['data-home-field']} attributes={attributesToProps(node.attribs)}/>;
      if (page.key === 'our-people' && node.name === 'main') return <main id={node.attribs.id} tabIndex={-1}><PeopleDirectory locale={page.locale} initialPeople={page.people} /></main>;
      const person = people.find(p => p.placements?.some(slot => slot.nodeId && slot.page === page.key && slot.nodeId === node.attribs.id));
      if (person) return <PersonPlacement locale={page.locale} person={person} placement={person.placements.find(slot => slot.nodeId === node.attribs.id)} attributes={attributesToProps(node.attribs)} html={render(node.children)} />;
      markResponsiveNode(node);
      // Home centers: list + Google map (old kaiming.org layout).
      if (page.key === 'home' && node.attribs.id === 'comp-mufv1ode') {
        const fields = centerFields(node, page.locale);
        if (fields) return <CenterMap locale={page.locale} id={node.attribs.id} fields={fields} />;
      }
      if (node.attribs.id === 'comp-muoke23s') {
        return <EligibilityCalculator locale={page.locale} attributes={attributesToProps(node.attribs)} />;
      }
      if (node.name === 'button' && node.attribs?.['data-hook'] === 'dropdown-base') {
        const match = (node.attribs['aria-labelledby'] || '').match(/form-field-label-([a-f0-9-]{36})-/i);
        const field = match && enrollmentFields[match[1]];
        if (field) return <FormDropdown locale={page.locale} field={{ ...field, id: match[1] }} attributes={attributesToProps(node.attribs)} />;
      }
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
        return <Component locale={page.locale} attributes={attributesToProps(node.attribs)} html={render(node.children)} groups={navigationFromNodes(node.children)} />;
      }
      if (node.name === 'km-news-list') return <BlogList locale={page.locale} initialPosts={page.posts} />;
      if (node.attribs?.['data-gallery']) {
        return <Gallery id={node.attribs.id} className={node.attribs.class} items={JSON.parse(node.attribs['data-gallery'])} />;
      }
    },
  };
  return <div className="km-responsive" lang={htmlLang(page.locale)} data-page={page.slug||page.key}>
    <LanguageSwitcher locale={page.locale} pageKey={page.slug||page.key}/>
    <style dangerouslySetInnerHTML={{ __html: page.css }} />
    <style dangerouslySetInnerHTML={{ __html: brandedResponsiveCss }} />
    {mobileTypography[page.key]&&<style dangerouslySetInnerHTML={{ __html: brandCss(mobileTypography[page.key]) }} />}
    {page.key==='home'?<HomeContentProvider locale={page.locale} initialRecord={page.homeRecord}>{parse(page.html, options)}</HomeContentProvider>:parse(page.html, options)}
    <Interactions />
    <BoxFit />
  </div>;
}
