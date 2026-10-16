export default function SiteFooter({ attributes, html }) {
  return <footer {...attributes} dangerouslySetInnerHTML={{ __html: html }} />;
}
