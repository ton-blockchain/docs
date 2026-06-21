import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import { NextProvider } from 'fumadocs-core/framework/next';
import { TreeContextProvider } from 'fumadocs-ui/contexts/tree';
import { source } from '@/lib/source';

import './global.css';
import 'katex/dist/katex.css';

const inter = Inter({
  subsets: ['latin'],
});

// const mono = JetBrains_Mono({
//   variable: '--font-mono',
//   subsets: ['latin'],
// });

// export const metadata = createMetadata({
//   title: {
//     template: '%s | Fumadocs',
//     default: 'Fumadocs',
//   },
//   description: 'The React.js documentation framework.',
//   metadataBase: baseUrl,
// });

// export const viewport: Viewport = {
//   themeColor: [
//     { media: '(prefers-color-scheme: dark)', color: '#1E2337' },
//     { media: '(prefers-color-scheme: light)', color: '#F7F9FB' },
//   ],
// };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <NextProvider>
          <TreeContextProvider tree={source.getPageTree()}>
            <Provider>{children}</Provider>
          </TreeContextProvider>
        </NextProvider>
      </body>
    </html>
  );
}
