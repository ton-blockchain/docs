import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { gitConfig } from '@/lib/shared';
import { ThemeLogo } from '@/components/ui/logo';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{
        // JSX supported
        title: <ThemeLogo />,
      }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
    >
      {children}
    </HomeLayout>
  );
}
