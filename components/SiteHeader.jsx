import MobileNavigation from './MobileNavigation';
export default function SiteHeader({ attributes, html, groups }) {
  return <header {...attributes}>
    <div className="km-desktop-header" dangerouslySetInnerHTML={{ __html: html }} />
    <MobileNavigation groups={groups} />
  </header>;
}
