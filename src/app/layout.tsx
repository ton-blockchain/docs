import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import logoDark from '@/public/logo/dark.svg';
import logoLight from '@/public/logo/light.svg';

import './global.css';
import 'katex/dist/katex.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  icons: {
    icon: [
      {
        url: logoLight,
        media: '(prefers-color-scheme: light)',
        type: 'image/svg+xml',
      },
      {
        url: logoDark,
        media: '(prefers-color-scheme: dark)',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
