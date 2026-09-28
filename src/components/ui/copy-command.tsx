'use client';

import { Check, Copy } from 'lucide-react';
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button';

export function CopyCommand({ command }: { command: string }) {
  const [copied, copy] = useCopyButton(() => navigator.clipboard.writeText(command));

  return (
    <div className="flex min-w-0 overflow-hidden rounded-lg border border-fd-border bg-fd-background">
      <code className="min-w-0 flex-1 break-all whitespace-normal px-4 py-3 font-mono text-sm leading-5 lg:text-xs">
        {command}
      </code>
      <button
        type="button"
        aria-label={copied ? 'Command copied' : 'Copy command'}
        onClick={copy}
        className="flex w-11 shrink-0 items-center justify-center border-l border-fd-border text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fd-primary"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
