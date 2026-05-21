import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Mermaid } from '@/components/mdx/mermaid';
import { ImageZoom } from '@/components/image-zoom';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...Twoslash,
    Mermaid,
    // See: https://www.fumadocs.dev/docs/ui/components/image-zoom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img: props => <ImageZoom {...(props as any)} />,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
