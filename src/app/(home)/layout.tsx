import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo, Telegram, XTwitter } from '@/components/ui/logo';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{
        // JSX supported
        title: <ThemeLogo />,
      }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
      links={[
        {
          type: 'icon',
          icon: <XTwitter />,
          text: 'X/Twitter',
          url: 'https://x.com/ton_blockchain',
          external: true,
        },
        {
          type: 'icon',
          icon: <Telegram />,
          text: 'Telegram',
          url: 'https://t.me/addlist/1r5Vcb8eljk5Yzcy',
          external: true,
        },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
