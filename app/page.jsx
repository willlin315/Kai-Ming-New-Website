import PageView from '../components/PageView';
import { getPage, getMetadata } from '../lib/content';
export function generateMetadata() { return getMetadata('home'); }
export default function Home() { return <PageView page={getPage('home')} />; }
