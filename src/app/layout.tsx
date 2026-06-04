import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import { Banner } from '@/components/mdx/banner';

import './global.css';
import 'katex/dist/katex.css';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Banner
          variant="rainbow"
          rainbowColors={[
            'rgba(255,100,0, 0.5)',
            'transparent',
            'rgba(255,100,0, 0.5)',
            'transparent',
            'rgba(255,100,0, 0.5)',
            'transparent',
          ]}
        >
          <b>WARNING:</b>&nbsp;This is an experimental setup that is currently in the works. Not ready for public use!
        </Banner>
        <Provider>
          {children}
        </Provider>
      </body>
    </html>
  );
}
