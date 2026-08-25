'use client';

import dynamic from 'next/dynamic';

export interface MermaidProps {
  chart: string;
}

// NOTE: Mermaid is used by a small subset of pages, so it is loaded dynamically.
const MermaidRenderer = dynamic<MermaidProps>(() => import('./mermaid-static'), {
  loading: () => <div className="flex min-h-16 justify-center" aria-label="Loading diagram..." />,
});

export function Mermaid(props: MermaidProps) {
  return <MermaidRenderer {...props} />;
}
