import PageView from '../components/PageView';
import { getMetadata } from '../lib/content';
import { loadPage } from '../lib/page-data';
export function generateMetadata() { return getMetadata('home'); }
export default async function Home() { return <PageView page={await loadPage('home')} />; }
