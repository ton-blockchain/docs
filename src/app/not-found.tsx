import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { appName, gitConfig } from '@/lib/shared';

export default function NotFound() {
  return (
    <HomeLayout
      nav={{
        title: appName,
      }}
      githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
    >
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-sm font-medium text-fd-muted-foreground">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 max-w-md text-fd-muted-foreground">
          The page you are looking for does not exist :(
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
          >
            Go to the home page
          </Link>
          <Link
            href="/get-support"
            className="rounded-md border border-fd-border px-4 py-2 text-sm font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            Ask in chats
          </Link>
        </div>
      </main>
    </HomeLayout>
  );
}
