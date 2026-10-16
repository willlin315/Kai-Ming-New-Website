import MobileNavigation from './MobileNavigation';
export default function SiteHeader({ attributes, html, groups,locale='en' }) {
  return <header {...attributes}>
    <div className="km-desktop-header" dangerouslySetInnerHTML={{ __html: html }} />
    <MobileNavigation locale={locale} groups={groups} />
  </header>;
}
