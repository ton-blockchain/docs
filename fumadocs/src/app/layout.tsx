// import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import { source } from '@/lib/source';
import { appName, gitConfig } from '@/lib/shared';

import './global.css';
import 'katex/dist/katex.css';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>
          <DocsLayout
            nav={{
              // JSX supported
              title: appName,
              mode: 'top'
            }}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
            tree={source.getPageTree()}
            sidebar={{
              collapsible: false,
            }}
            tabMode="navbar"
          >
            {children}
          </DocsLayout>
        </Provider>
      </body>
    </html>
  );
}
