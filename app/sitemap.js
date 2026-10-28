import {locales} from '../lib/i18n';
import { pageRoutes, hrefFor } from '../lib/content';
import { publishedPosts } from '../lib/cms-build';
import { storyPath } from '../lib/story-page';
// Regenerated hourly so newly published stories appear.
export const revalidate = 3600;
// Empty until SITE_URL (the public origin) is set for the production build.
export default async function sitemap() {
  const origin = process.env.SITE_URL;
  if (!origin) return [];
  const abs = (path) => new URL(path, origin).href;
  const pages = pageRoutes.flatMap(({key})=>locales.map(locale=>({url:abs(hrefFor(key,locale)),alternates:{languages:Object.fromEntries(locales.map(l=>[l,abs(hrefFor(key,l))]))}})));
  const posts = await publishedPosts();
  const stories = posts.flatMap((post)=>locales.map(locale=>({url:abs(storyPath(post.slug,locale)),...(post.updatedAt||post.publishedAt?{lastModified:post.updatedAt||post.publishedAt}:{}),alternates:{languages:Object.fromEntries(locales.map(l=>[l,abs(storyPath(post.slug,l))]))}})));
  return [...pages, ...stories];
}
