'use client';

import { use, useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';
import { renderMermaidSVG } from 'beautiful-mermaid';
import { ReadableStreamBYOBReader } from 'stream/web';
import cluster from 'cluster';

export function Mermaid({ chart }: { chart: string }) {
  try {
    const svg = renderMermaidSVG(chart, {
      bg: 'var(--color-fd-background)',
      fg: 'var(--color-fd-foreground)',
      interactive: true,
      transparent: true,
      // ...(chart.startsWith('graph') && {font: 'monospace'}),
    });

    return <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />;
  } catch {
    return <MermaidFallback chart={chart} />;
  }
}

function MermaidFallback({ chart }: { chart: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return;
  return <MermaidContent chart={chart} />;
}

const cache = new Map<string, Promise<unknown>>();

function cachePromise<T>(key: string, setPromise: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached) return cached as Promise<T>;

  const promise = setPromise();
  cache.set(key, promise);
  return promise;
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const { default: mermaid } = use(cachePromise('mermaid', () => import('mermaid')));

  // See: https://mermaid.js.org/config/theming.html#theme-variables
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeCSS: 'margin: 1.5rem auto 0;',
    theme: resolvedTheme === 'dark' ? 'dark' : 'neutral',
    themeVariables: {
      clusterBkg: 'transparent',
    },
    flowchart: {
      diagramPadding: 2,
      rankSpacing: 30,
    },
  });

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () => {
      return mermaid.render(id, chart.replaceAll('\\n', '\n'));
    }),
  );

  return (
    <div
      className="flex justify-center"
      ref={(container) => {
        if (container) bindFunctions?.(container);
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
