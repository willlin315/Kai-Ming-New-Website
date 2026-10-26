import { Comfortaa, Noto_Sans_TC } from 'next/font/google';
import { getFonts, basePath } from '../lib/content';
import { tokensCss } from '../lib/brand';
import './globals.css';

// Brand book typography: Comfortaa × 思源柔黑體 (Noto Sans TC is the web-safe 思源 family).
const comfortaa = Comfortaa({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '700'], variable: '--font-comfortaa', display: 'swap' });
const notoTc = Noto_Sans_TC({ weight: ['400', '500', '700'], variable: '--font-noto-tc', display: 'swap', preload: false });

export const metadata = {
  ...(process.env.SITE_URL ? { metadataBase: new URL(process.env.SITE_URL) } : {}),
  title: 'Kai Ming Head Start',
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: `${basePath}/brand/favicon-32.png`, sizes: '32x32', type: 'image/png' }, { url: `${basePath}/brand/icon-192.png`, sizes: '192x192', type: 'image/png' }],
    apple: `${basePath}/brand/apple-touch-icon.png`,
  },
  openGraph: { siteName: 'Kai Ming Head Start', images: [{ url: `${basePath}/brand/og-default.png`, width: 1200, height: 630, alt: 'Kai Ming — Potential Has No Limits' }] },
};
export const viewport = { themeColor: '#436EA9' };

export default function RootLayout({ children }) {
  return <html lang="en" className={`${comfortaa.variable} ${notoTc.variable}`}>
    <head>
      <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
      <style dangerouslySetInnerHTML={{ __html: getFonts() }} />
    </head>
    <body>{children}</body>
  </html>;
}
