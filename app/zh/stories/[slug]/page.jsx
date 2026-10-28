import { notFound } from 'next/navigation';
import PublishedArticle from '../../../../components/PublishedArticle';
import { storyParams, storyMetadata, storyProps } from '../../../../lib/story-page';
// New posts published in the CMS render on first visit; publishing revalidates existing ones.
export const dynamicParams = true;
export function generateStaticParams() { return storyParams(); }
export async function generateMetadata({ params }) { const { slug } = await params; return storyMetadata(slug, 'zh-Hant'); }
export default async function Story({ params }) {
  const { slug } = await params;
  const props = await storyProps(slug, 'zh-Hant');
  if (!props.initialPost) notFound();
  return <PublishedArticle {...props} />;
}
