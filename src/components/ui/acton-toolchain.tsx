'use client';

import { ArrowUpRight, Play } from 'lucide-react';
import NextImage from 'next/image';
import { useRef, useState } from 'react';
import { CopyCommand } from '@/components/ui/copy-command';
import themeStyles from '@/components/ui/theme.module.css';

const docs = 'https://ton-blockchain.github.io/acton/docs';
const installCommand =
  'curl -LsSf https://github.com/ton-blockchain/acton/releases/latest/download/acton-installer.sh | sh';

const media = 'https://strapi-images-data.s3.eu-central-1.amazonaws.com/tolk';

const features = [
  {
    title: 'Test contract behavior',
    description: 'Run tests that follow transaction flows between contracts.',
    poster: `${media}/01-tolk-tests-poster.png`,
    video: `${media}/01-tolk-tests-no-outro.mp4`,
  },
  {
    title: 'Debug failures',
    description: 'Pause at a failure and inspect the code, call stack, and local values.',
    poster: `${media}/04-debugger-poster.png`,
    video: `${media}/04-debugger-no-outro.mp4`,
  },
  {
    title: 'Connect contracts to apps',
    description: 'Generate typed interfaces for web apps that connect to TON wallets.',
    poster: `${media}/02-dApp-ready-poster.png`,
    video: `${media}/02-dApp-ready-no-outro.mp4`,
  },
  {
    title: 'Deploy and verify',
    description: 'Manage wallets, get testnet funds, deploy and verify contracts.',
    poster: `${media}/05-faucet-poster.png`,
    video: `${media}/05-faucet-no-outro.mp4`,
  },
] as const;

const guides = [
  { title: 'Quickstart', href: `${docs}/quickstart` },
  { title: 'Walkthrough', href: `${docs}/walkthrough` },
  { title: 'Your first smart contract', href: `${docs}/tutorial/overview` },
  { title: 'Agent skills', href: `${docs}/agent-skills/overview` },
  { title: 'Rest of the Acton docs', href: `${docs}/welcome` },
] as const;

function FeatureVideo({ title, poster, src }: { title: string; poster: string; src: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  function play() {
    const player = video.current;
    if (!player) return;
    setStarted(true);
    void player.play().catch(() => setStarted(false));

    const nativePlayer = player as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (nativePlayer.webkitEnterFullscreen) {
      nativePlayer.webkitEnterFullscreen();
    } else {
      void player.requestFullscreen?.();
    }
  }

  return (
    <div className="relative aspect-video min-w-0 overflow-hidden rounded-lg border border-fd-border bg-fd-card sm:col-span-2">
      <video
        ref={video}
        aria-label={`${title} video`}
        className="size-full object-cover"
        controls={started}
        controlsList="nodownload noplaybackrate"
        playsInline
        poster={poster}
        preload="none"
        src={src}
      >
        Your browser does not support video playback.
      </video>
      {!started && (
        <button
          type="button"
          aria-label={`Play ${title} video in fullscreen`}
          onClick={play}
          className="absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-primary"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-fd-primary text-fd-primary-foreground">
            <Play className="size-5 fill-current" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}

function ActonLogo() {
  return (
    <>
      <NextImage
        src="/logo/acton-light.svg"
        alt=""
        width={28}
        height={28}
        className={`size-7 rounded-md ${themeStyles.dark}`}
      />
      <NextImage
        src="/logo/acton-dark.svg"
        alt=""
        width={28}
        height={28}
        className={`size-7 rounded-md ${themeStyles.light}`}
      />
    </>
  );
}

export function ActonToolchain() {
  return (
    <div className="rounded-2xl border border-fd-border bg-fd-card p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          <ActonLogo />
        </span>
        <p className="max-w-4xl text-base leading-7 text-fd-muted-foreground">
          <a
            href="https://ton-blockchain.github.io/acton/"
            target="_blank"
            rel="noreferrer"
            className="text-xl font-semibold tracking-tight text-fd-foreground underline underline-offset-2 hover:text-fd-primary"
          >
            Acton
          </a>{' '}
          is a TON smart contract toolkit. One CLI handles project setup, builds, tests, scripts,
          linting, formatting, debugging, deployment, and verification.{' '}
          <a
            href={`${docs}/studio`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-fd-foreground underline underline-offset-2 hover:text-fd-primary"
          >
            Acton Studio
          </a>{' '}
          adds a browser workspace with comprehensive UI for local tests, virtual environments, and
          interaction with real networks, such as mainnet and testnet.
        </p>
      </div>

      <div className="mt-7 grid gap-3 lg:grid-cols-2">
        {features.map(({ title, description, poster, video }) => (
          <article
            key={title}
            className="grid min-w-0 gap-4 rounded-xl border border-fd-border bg-fd-background p-4 sm:grid-cols-5 sm:items-center"
          >
            <div className="min-w-0 sm:col-span-3">
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-5 text-fd-muted-foreground">{description}</p>
            </div>
            <FeatureVideo title={title} poster={poster} src={video} />
          </article>
        ))}
      </div>

      <div className="mt-7">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-base font-semibold text-fd-foreground">Ready to build?</h3>
          <p className="text-sm text-fd-muted-foreground">
            Install Acton, then choose a guide below.
          </p>
        </div>
        <CopyCommand command={installCommand} />
      </div>

      <nav
        aria-label="Acton guides"
        className="mt-4 flex flex-wrap justify-start gap-2 lg:justify-around lg:gap-3"
      >
        {guides.map(({ title, href }, index) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-center text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary ${index === 0 ? 'border-fd-primary bg-fd-primary text-fd-primary-foreground hover:brightness-95' : 'border-fd-border bg-fd-background text-fd-foreground hover:border-fd-primary'}`}
          >
            {title} <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          </a>
        ))}
      </nav>

      <p className="mt-5 md:text-right text-sm leading-5 text-fd-muted-foreground lg:text-xs">
        Building a frontend? See the{' '}
        <a
          href={`${docs}/dapps`}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2"
        >
          Acton dApp guide
        </a>
        .<br className="md:hidden" /> Telegram Mini Apps selling digital goods or services must use{' '}
        <a
          href="https://core.telegram.org/bots/payments-stars"
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-2"
        >
          Stars
        </a>
        .
      </p>
    </div>
  );
}
