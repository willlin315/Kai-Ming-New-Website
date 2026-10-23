import { notFound } from 'next/navigation';
import PageView from '../../../components/PageView';
import { getMetadata, pageRoutes } from '../../../lib/content';
import { loadPage } from '../../../lib/page-data';
export const dynamicParams = false;
export function generateStaticParams() {
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
