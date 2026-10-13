export default function SiteHeader({ attributes, html }) {
  return <header {...attributes} dangerouslySetInnerHTML={{ __html: html }} />;
}
