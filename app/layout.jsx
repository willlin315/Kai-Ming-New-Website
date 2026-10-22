import { getFonts } from '../lib/content';
import './globals.css';
export const metadata = { title: 'Kai Ming Head Start', robots: { index: false, follow: false } };
export const viewport = { width: 'device-width', initialScale: 1 };
// Wix serves phones a 320px-wide mobile layout that the browser zooms to the screen width.
// Use the same viewport on phones so mobile type and spacing match Wix at every phone size.
// The tag is written while the head is parsed; a later viewport tag overrides the default one.
const phoneViewport = `if(Math.min(screen.width,screen.height)<768)document.write('<meta name="viewport" content="width=320, user-scalable=yes">');`;
export default function RootLayout({ children }) {
  return <html lang="en"><head><style dangerouslySetInnerHTML={{ __html: getFonts() }} /><script dangerouslySetInnerHTML={{ __html: phoneViewport }} /></head><body>{children}</body></html>;
}
