import { getPage } from './content';
import { publishedHome, publishedPeople, publishedPosts } from './cms-build';

// Static page plus the published CMS records it displays, resolved at build time.
export async function loadPage(slug, locale = 'en') {
  const page = getPage(slug, locale);
  if (!page) return null;
  const people = await publishedPeople();
  if (people) page.people = people;
  if (page.key === 'home') page.homeRecord = await publishedHome();
  if (page.html.includes('<km-news-list')) page.posts = await publishedPosts();
  return page;
}
