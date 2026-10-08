import type { Metadata } from 'next';
import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Blocks,
  BrickWall,
  CloudLightning,
  Coins,
  FileCodeCorner,
  Fuel,
  Image,
  LifeBuoy,
  MessageCircleCode,
  Rocket,
  Send,
  Server,
  Wallet,
} from 'lucide-react';
import { ActonToolchain } from '@/components/ui/acton-toolchain';
import { CopyPromptButton } from '@/components/ui/copy-prompt-button';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'TON Docs — developer documentation',
  description:
    'TON is a blockchain platform designed for scalable smart contracts, applications, and payments at consumer scale.',
  metadataBase: process.env.NEXT_PUBLIC_BASE_URL,
  openGraph: {
    images: 'logo/og-image.png',
  },
  twitter: {
    images: 'logo/og-image.png',
  },
};

type QuickLink = { title: string; href: string; external?: boolean | undefined };

type Action = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

type Path = {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  links: QuickLink[];
};

type Support = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const appActions: Action[] = [
  {
    // title: 'Add TON to an existing app',
    title: 'Integrate through TON Connect',
    description: 'Connect wallets and verify users in the existing app.',
    href: '/applications/ton-connect/get-started',
    icon: Blocks,
  },
  // {
  //   title: 'Issue Gram and USDT invoices',
  //   description: 'Request wallet transfers and verify payments on the server.',
  //   href: '/applications/payments/invoice',
  //   icon: Wallet, // Server
  // },
  {
    // title: 'Run a self-hosted payment processor',
    title: 'Set up Gram and USDT payments',
    // description: 'Operate deposits and withdrawals in business applications.',
    description: 'Run a self-hosted payment processor.',
    href: '/applications/payments/setup',
    icon: Wallet,
  },
];

const tokenActions: Action[] = [
  {
    title: 'Create a Jetton (FT)',
    href: '/contracts/standard/tokens/jettons/create',
    description: 'Deploy a fungible token currency.',
    icon: Coins,
  },
  // {
  //   title: 'Create an NFT',
  //   href: '/contracts/standard/tokens/nft/create',
  //   description: 'Deploy a collection and mint the first item.',
  //   icon: Image,
  // },
];

// Quick links grouped by audience (section), mirroring the "journeys" on the legacy index page.
const paths: Path[] = [
  {
    title: 'Onboarding',
    description: 'For newcomers entering Web3 through TON.',
    icon: Rocket,
    links: [
      { title: 'Overview of TON and the documentation', href: '/start-here' },
      { title: 'Create a TON wallet', href: '/onboarding/wallet-apps/web' },
      { title: 'Read blockchain data with explorers', href: '/onboarding/explorers' },
      { title: 'Enable TON for agents with @ton/mcp', href: '/onboarding/ai/mcp' },
    ],
  },
  {
    title: 'Applications',
    description: 'Build dApps, wallets, and payment services on TON.',
    icon: Blocks,
    links: [
      {
        title: 'Overview',
        href: '/applications/overview',
      },
      {
        title: 'Create tools using SDKs',
        href: '/applications/sdks',
      },
      {
        title: 'Integrate dApps and wallets with TON Connect',
        href: '/applications/ton-connect/overview',
      },
      {
        title: 'Process payments in business applications',
        href: '/applications/payments/overview',
      },
    ],
  },
  {
    title: 'Nodes',
    description: 'Run and manage TON blockchain nodes.',
    icon: Server,
    links: [
      { title: 'Overview', href: '/nodes/overview' },
      { title: 'C++ node setup', href: '/nodes/cpp/setup-mytonctrl' },
      {
        title: 'Run a validator node',
        href: '/nodes/cpp/run-validator',
      },
      {
        title: 'Run a liteserver node',
        href: '/nodes/cpp/run-liteserver',
      },
      { title: 'Run an archive liteserver', href: '/nodes/cpp/run-archive-liteserver' },
    ],
  },
  {
    title: 'APIs',
    description: 'Access TON data via hosted APIs or self-hosted options.',
    icon: CloudLightning,
    links: [
      { title: 'Overview', href: '/api/overview' },
      { title: 'API v2: direct liteserver', href: '/api/v2/overview' },
      { title: 'API v3: indexed database', href: '/api/v3/overview' },
      { title: 'Streaming API: status updates', href: '/api/streaming/overview' },
      { title: 'Get API key', href: '/api/get-api-key' },
    ],
  },
  {
    title: 'Smart contracts',
    description: 'Build, debug, and deploy smart contracts.',
    icon: FileCodeCorner,
    links: [
      { title: 'Overview', href: '/contracts/overview' },
      { title: 'Toolchain and IDEs', href: '/contracts/overview#toolchain' },
      // { title: 'Acton toolchain', href: '/contracts/acton', external: true },
      // { title: 'IDEs and editor plugins', 'href': '/contracts/overview#ides-and-editor-plugins' },
      // { title: 'JetBrains IDE plugin', href: '/contracts/ide/jetbrains' },
      // { title: 'VS Code extension', href: '/contracts/ide/vscode' },
      { title: 'Wallet contracts', href: '/contracts/standard/overview#wallets' },
      { title: 'Jettons and NFTs', href: '/contracts/standard/overview#tokens' },
      { title: 'Advanced techniques', href: '/contracts/overview#techniques' },
    ],
  },
  {
    title: 'Tolk language',
    description: 'Master the language of TON smart contracts.',
    icon: MessageCircleCode,
    links: [
      { title: 'Overview', href: '/tolk/overview' },
      { title: 'Basic syntax', href: '/tolk/basic-syntax' },
      { title: 'Idioms and conventions', href: '/tolk/idioms-conventions' },
      { title: 'Type system', href: '/tolk/types/list-of-types' },
      {
        title: 'Standard library reference',
        href: 'https://ton-blockchain.github.io/acton/docs/tolk_standard_library/overview',
        external: true,
      },
    ],
  },
  {
    title: 'TVM: TON Virtual Machine',
    description: 'Skim the detailed reference of the smart-contract runtime.',
    icon: Fuel,
    links: [
      { title: 'Overview', href: '/tvm/overview' },
      { title: 'Exit codes', href: '/tvm/exit-codes' },
      { title: 'Instructions', href: '/tvm/instructions' },
      { title: 'Gas', href: '/tvm/gas' },
      { title: 'Registers', href: '/tvm/registers' },
    ],
  },
  {
    title: 'Blockchain foundations',
    description: 'Learn all the ins and outs of the TON blockchain.',
    icon: BrickWall,
    links: [
      { title: 'Overview', href: '/foundations/overview' },
      { title: 'Addresses', href: '/foundations/addresses/overview' },
      { title: 'Transaction fees', href: '/foundations/fees' },
      { title: 'Config', href: '/foundations/config' },
      { title: 'TL-B', href: '/foundations/tlb/overview' },
    ],
  },
];

const support: Support[] = [
  {
    title: 'Get support',
    description: 'Learn how to get help on the dedicated page.',
    href: '/get-support',
    icon: LifeBuoy,
  },
  {
    title: 'Telegram folder',
    description: 'Add the folder with many developer chats.',
    href: 'https://t.me/addlist/1r5Vcb8eljk5Yzcy',
    icon: Send,
  },
  {
    title: 'TON Dev chat',
    description: 'Join the discussion in the main TON development chat on Telegram.',
    href: 'https://t.me/tondev_eng',
    icon: Send,
  },
];

function isExternal(href: string): boolean {
  return href.startsWith('http');
}

function QuickLinkRow({ title, href, external }: QuickLink) {
  const className =
    'group -mx-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground';
  const Component = external ? ArrowUpRight : ArrowRight;
  const arrow = (
    <Component className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-fd-primary" />
  );

  if (isExternal(href) || external) {
    return (
      <a className={className} href={href} target="_blank" rel="noreferrer">
        <span>{title}</span>
        {arrow}
      </a>
    );
  }

  return (
    <Link className={className} href={href} prefetch={false}>
      <span>{title}</span>
      {arrow}
    </Link>
  );
}

function ActionLink({
  action,
  children,
  className,
}: {
  action: Pick<Action, 'href'>;
  children: ReactNode;
  className: string;
}) {
  if (isExternal(action.href)) {
    return (
      <a className={className} href={action.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={action.href} prefetch={false}>
      {children}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(color-mix(in oklab, var(--color-fd-primary), transparent 80%) 1px, transparent 1.4px)',
            backgroundSize: '24px 24px',
            backdropFilter: 'blur(10px)',
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-6 pb-20 pt-14 text-left sm:pt-20">
        <header
          id="use-ton"
          className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14"
        >
          <div>
            <p className="text-sm font-semibold text-fd-primary">The Open Network</p>
            <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              TON Documentation
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-fd-muted-foreground">
              TON is a blockchain platform designed for scalable smart contracts, applications, and
              payments at consumer scale.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {/* <Link
                href="/start-here"
                prefetch={false}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-fd-primary px-5 text-base font-medium text-fd-primary-foreground transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
              >
                Start here
              </Link> */}
              <CopyPromptButton />
            </div>
          </div>
          <nav aria-label="Add payments and wallet features to an existing app">
            <p className="mb-3 text-sm font-semibold text-fd-primary">Payments and integrations</p>
            <ul className="mb-9 grid gap-3">
              {appActions.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.href}>
                    <ActionLink
                      action={action}
                      className="group flex items-center gap-4 rounded-xl border border-fd-border bg-fd-card px-5 py-4 transition-colors hover:border-fd-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
                    >
                      <Icon className="size-5 shrink-0 text-fd-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{action.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-fd-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-fd-primary" />
                    </ActionLink>
                  </li>
                );
              })}
            </ul>
            <p className="mb-3 text-sm font-semibold text-fd-primary">Fungible tokens</p>
            <ul className="grid gap-3">
              {tokenActions.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.href}>
                    <ActionLink
                      action={action}
                      className="group flex items-center gap-4 rounded-xl border border-fd-border bg-fd-card px-5 py-4 transition-colors hover:border-fd-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
                    >
                      <Icon className="size-5 shrink-0 text-fd-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{action.title}</span>
                        <span className="mt-1 block text-sm leading-5 text-fd-muted-foreground">
                          {action.description}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-fd-primary" />
                    </ActionLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <section className="mt-12 flex flex-col gap-6">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            Unified toolchain for smart contracts
          </h2>
          <ActonToolchain />
        </section>

        {/* Future TON DNS, .ton websites, and other Web3 actions can go here. */}

        {/* pathfinding */}
        <section className="mt-12 flex flex-col gap-6">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">Learning paths</h2>
          {/* <h2 className="text-balance text-2xl font-semibold tracking-tight">Choose your path</h2> */}
          <div className="grid gap-4 sm:grid-cols-2">
            {paths.map(({ title, description, icon: Icon, links }) => (
              <div
                key={title}
                className="flex flex-col rounded-2xl border border-fd-border bg-fd-card p-6"
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-6 text-fd-primary" />
                  <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="mt-3 text-sm text-fd-muted-foreground">{description}</p>
                <ul className="mt-4 flex flex-col gap-0.5">
                  {links.map((link) => (
                    <li key={link.href}>
                      <QuickLinkRow {...link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* troubleshooting */}
        <section className="mt-12 flex flex-col gap-4">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">Troubleshooting</h2>
          <p className="text-pretty text-fd-muted-foreground">
            Press{' '}
            <kbd className="rounded border border-fd-border bg-fd-muted px-1.5 py-0.5 font-mono text-xs">
              Ctrl K
            </kbd>{' '}
            to search the docs. Still stuck? Discuss issues and best practices with other community
            members.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {support.map(({ title, description, href, icon: Icon }) => {
              const className =
                'group flex flex-col rounded-2xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary hover:bg-fd-accent dark:hover:bg-fd-background';
              const inner = (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className="size-4.5 text-fd-primary" />
                    <h3 className="font-semibold">{title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-fd-muted-foreground">{description}</p>
                </>
              );

              return isExternal(href) ? (
                <a key={title} className={className} href={href} target="_blank" rel="noreferrer">
                  {inner}
                </a>
              ) : (
                <Link key={title} className={className} href={href} prefetch={false}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
