import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { appName, gitConfig } from '@/lib/shared';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <HomeLayout
      nav={{
        // JSX supported
        title: appName,
      }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
    >
      {children}
    </HomeLayout>
  );
}
