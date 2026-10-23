import { getFonts } from '../lib/content';
import './globals.css';
export const metadata = { title: 'Kai Ming Head Start', robots: { index: false, follow: false } };
export default function RootLayout({ children }) {
  return <html lang="en"><head><style dangerouslySetInnerHTML={{ __html: getFonts() }} /></head><body>{children}</body></html>;
}
