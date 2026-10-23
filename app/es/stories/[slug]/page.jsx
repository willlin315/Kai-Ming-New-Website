import PublishedArticle from '../../../../components/PublishedArticle';
import { storyParams, storyMetadata, storyProps } from '../../../../lib/story-page';
export const dynamicParams = false;
export function generateStaticParams() { return storyParams(); }
export async function generateMetadata({ params }) { const { slug } = await params; return storyMetadata(slug, 'es'); }
export default async function Story({ params }) {
  const { slug } = await params;
  const props = await storyProps(slug, 'es');
  return <PublishedArticle {...props} />;
}
