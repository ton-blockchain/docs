'use client';

import NextImage from 'next/image';
import { useEffect, useRef, useState } from 'react';
import themeStyles from '@/components/ui/theme.module.css';

const prompt =
  'Install the ton-blockchain (TON documentation) skill from https://github.com/ton-blockchain/skills/tree/main/ton-blockchain. Then follow it, using TON Docs as the primary source for my task.';

const agents = ['claude', 'codex', 'cursor', 'opencode'] as const;

export function CopyPromptButton() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      return;
    }

    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      title="Sets up your AI agent for TON"
      className="inline-flex h-12 cursor-copy items-center justify-center gap-2.5 rounded-xl border border-fd-border bg-fd-card px-5 text-base font-medium text-fd-foreground transition-colors hover:border-fd-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fd-primary"
      onClick={copyPrompt}
    >
      <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
        {agents.map((agent) => (
          <span key={agent}>
            <NextImage
              src={`/icons/${agent}-light.svg`}
              alt=""
              width={20}
              height={20}
              className={`size-5 ${themeStyles.light}`}
            />
            <NextImage
              src={`/icons/${agent}-dark.svg`}
              alt=""
              width={20}
              height={20}
              className={`size-5 ${themeStyles.dark}`}
            />
          </span>
        ))}
      </span>
      <span aria-live="polite">{copied ? 'Prompt copied!' : 'Copy prompt'}</span>
    </button>
  );
}
