import {locales} from '../lib/i18n';
import { pageRoutes, hrefFor } from '../lib/content';
export const dynamic = 'force-static';
export default function sitemap() {
  const origin = process.env.SITE_URL;
  return origin ? pageRoutes.flatMap(({key})=>locales.map(locale=>({url:new URL(hrefFor(key,locale),origin).href,alternates:{languages:Object.fromEntries(locales.map(l=>[l,new URL(hrefFor(key,l),origin).href]))}}))) : [];
}
