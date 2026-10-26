import { locales, localePrefix, localizedRecord } from './i18n';
import { basePath } from './client-routes';
import { publishedPosts, publishedPost, absoluteImage, plainText } from './cms-build';

// Static export needs at least one path. The placeholder renders "not available".
export const STORY_PLACEHOLDER = 'not-available';

export async function storyParams() {
  const posts = await publishedPosts();
  return posts.length ? posts.map((post) => ({ slug: post.slug })) : [{ slug: STORY_PLACEHOLDER }];
}

export function storyPath(slug, locale) {
  return `${basePath}${localePrefix(locale)}/stories/${slug}/`;
}

export async function storyMetadata(slug, locale) {
  const raw = await publishedPost(slug);
  if (!raw) return { title: 'Stories | Kai Ming Head Start', robots: { index: false } };
  const post = localizedRecord(raw, locale);
  const origin = process.env.SITE_URL;
  const title = `${post.title} | Kai Ming Head Start`;
  const description = plainText(post.summary || post.bodyHtml || post.body || '', 200) || 'News and stories from Kai Ming Head Start.';
  const image = absoluteImage(raw.image, origin);
  const url = origin ? new URL(storyPath(slug, locale), origin).href : undefined;
  return {
    title,
    description,
    ...(origin ? { alternates: { canonical: url, languages: { ...Object.fromEntries(locales.map((l) => [l, new URL(storyPath(slug, l), origin).href])), 'x-default': new URL(storyPath(slug, 'en'), origin).href } } } : {}),
    openGraph: { type: 'article', title: post.title, description, siteName: 'Kai Ming Head Start', locale: locale === 'zh-Hant' ? 'zh_TW' : locale === 'es' ? 'es_US' : 'en_US', ...(url ? { url } : {}), ...(image ? { images: [{ url: image, alt: post.title }] } : {}) },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: post.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export async function storyProps(slug, locale) {
  const [post, posts] = await Promise.all([publishedPost(slug), publishedPosts()]);
  const origin = process.env.SITE_URL;
  return { locale, initialPost: post, initialPosts: posts, canonicalUrl: origin ? new URL(storyPath(slug, locale), origin).href : '' };
}
