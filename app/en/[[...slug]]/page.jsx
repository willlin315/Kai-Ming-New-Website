import { notFound } from 'next/navigation';
import PageView from '../../../components/PageView';
import { getPage, getMetadata, pageRoutes } from '../../../lib/content';
export const dynamicParams = false;
export function generateStaticParams() {
  return pageRoutes.map(({ key }) => ({ slug: key === 'home' ? [] : [key] }));
}
export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  return getMetadata(slug.length ? slug.join('/') : 'home');
}
export default async function Page({ params }) {
  const { slug = [] } = await params;
  const page = getPage(slug.length ? slug.join('/') : 'home');
  if (!page) notFound();
  return <PageView page={page} />;
}
