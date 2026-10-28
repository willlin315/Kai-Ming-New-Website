import { notFound } from 'next/navigation';
import PageView from '../../../components/PageView';
import { getMetadata, pageRoutes } from '../../../lib/content';
import { renderOnDemand } from '../../../lib/render-mode';
import { loadPage } from '../../../lib/page-data';
// Unknown paths fall through to loadPage(), which returns null -> 404.
export const dynamicParams = true;
export function generateStaticParams() {
  if (renderOnDemand()) return [];
  return pageRoutes.map(({ key, slug }) => ({ slug: key === 'home' ? [] : [slug || key] }));
}
export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  return getMetadata(slug.length ? slug.join('/') : 'home','zh-Hant');
}
export default async function Page({ params }) {
  const { slug = [] } = await params;
  const page = await loadPage(slug.length ? slug.join('/') : 'home','zh-Hant');
  if (!page) notFound();
  return <PageView page={page} />;
}
