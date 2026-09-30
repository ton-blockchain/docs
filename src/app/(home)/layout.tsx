import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo, Telegram, XTwitter } from '@/components/ui/logo';

export const dynamic = 'force-static';

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
          text: 'Onboarding',
          url: '/start-here',
        },
        {
          text: 'Nodes',
          url: '/nodes/overview',
        },
        {
          text: 'Applications',
          url: '/applications/overview',
        },
        {
          text: 'APIs',
          url: '/api/overview',
        },
        {
          text: 'Contracts',
          url: '/contracts/overview',
        },
        {
          text: 'Tolk',
          url: '/tolk/overview',
        },
        {
          text: 'TVM',
          url: '/tvm/overview',
        },
        {
          text: 'Foundations',
          url: '/foundations/overview',
        },
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
