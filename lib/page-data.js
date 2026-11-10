import { getPage } from './content';
import { publishedHome, publishedPeople, publishedPosts } from './cms-build';
import { announcementFrom } from './announcement';

// Static page plus the published CMS records it displays, resolved at build time.
export async function loadPage(slug, locale = 'en') {
  const page = getPage(slug, locale);
  if (!page) return null;
  const people = await publishedPeople();
  if (people) page.people = people;
  const home = await publishedHome();
  if (page.key === 'home') page.homeRecord = home;
  page.announcement = announcementFrom(home, page.locale);
  if (page.html.includes('<km-news-list')) page.posts = await publishedPosts();
  return page;
}
