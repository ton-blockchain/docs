import type { Metadata } from 'next';
import type { ComponentType } from 'react';
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

// Quick actions with most importance to newcomers
const actions: Action[] = [
  {
    // title: 'Process Gram and USDT payments',
    // title: 'Process Gram and USDT deposits and withdrawals',
    // title: 'Payments in Gram and USDT',
    title: 'Add Gram and USDT payments',
    href: '/applications/payments/setup',
    icon: Wallet,
  },
  {
    title: 'Create a Jetton (FT)',
    href: '/contracts/standard/tokens/jettons/create',
    icon: Coins,
  },
  // {
  //   title: 'Create an NFT',
  //   href: '/contracts/standard/tokens/nft/create',
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
      { title: 'Read blockchain data with explorers', href: '/onboarding/explorers/overview' },
      { title: 'Enable TON for agents with @ton/mcp', href: '/onboarding/ai/mcp' },
    ],
  },
  {
    title: 'Applications',
    description: 'Build dApps, wallets, and payment services on TON.',
    icon: Blocks,
    links: [
      {
        title: 'Build applications with AppKit',
        href: '/applications/appkit/overview',
      },
      {
        title: 'Integrate invoice payments with TON Pay',
        href: '/applications/ton-pay/overview',
      },
      {
        title: 'Make wallet services with WalletKit',
        href: '/applications/walletkit/overview',
      },
      {
        // title: 'Process Gram and USDT deposits and withdrawals',
        // href: '/applications/payments/setup',
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
    <Link className={className} href={href}>
      <span>{title}</span>
      {arrow}
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="relative isolate flex flex-1 flex-col justify-center text-center">
      {/* background dots */}
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

      <div className="relative isolate mx-auto w-full max-w-5xl px-6 py-12 text-left sm:py-16">
        {/* hero */}
        <section className="flex flex-col items-start gap-8 py-8 lg:flex-row lg:items-center lg:gap-12 lg:py-12">
          <img src="logo/ton.svg" alt="TON logo" className="hidden h-28 w-auto shrink-0 lg:block" />
          <div className="max-w-2xl">
            <h1 className="text-balance text-4xl font-semibold tracking-tight">
              TON Documentation
            </h1>
            <p className="mt-6 text-pretty text-xl text-fd-muted-foreground">
              TON is a blockchain platform designed for scalable smart contracts, applications, and
              payments at consumer scale.
            </p>
          </div>
        </section>

        {/* quick actions */}
        <section className="mt-4 flex flex-col gap-6">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">Common actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {actions.map(({ title, href, icon: Icon }) => {
              const className =
                'group flex min-h-20 items-center gap-3 rounded-2xl border border-fd-border bg-fd-card px-5 py-4 text-left transition-colors hover:border-fd-primary hover:bg-fd-accent dark:hover:bg-fd-background';
              // 'group flex flex-col rounded-2xl border border-fd-border bg-fd-card p-6 transition-colors hover:border-fd-primary';
              const inner = (
                <>
                  <Icon className="size-5 text-fd-primary" />
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-fd-card-foreground">
                    {title}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-fd-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-fd-primary" />
                </>
              );

              return isExternal(href) ? (
                <a key={title} className={className} href={href} target="_blank" rel="noreferrer">
                  {inner}
                </a>
              ) : (
                <Link key={title} className={className} href={href}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

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
                <Link key={title} className={className} href={href}>
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
