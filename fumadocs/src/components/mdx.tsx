import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { ImageZoom } from '@/components/mdx/image-zoom';
import { Mermaid } from '@/components/mdx/mermaid';
import { File, Files, Folder } from '@/components/mdx/files';
import { Accordion, Accordions } from '@/components/mdx/accordion';
import { Tabs, Tab } from '@/components/mdx/tabs';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // See: https://www.fumadocs.dev/docs/markdown/twoslash
    ...Twoslash,
    // See: https://www.fumadocs.dev/docs/markdown/mermaid
    Mermaid,
    // See: https://www.fumadocs.dev/docs/ui/components/files
    File,
    Files,
    Folder,
    // See: https://www.fumadocs.dev/docs/ui/components/accordion
    Accordion,
    Accordions,
    // See: https://www.fumadocs.dev/docs/ui/components/tabs
    Tab,
    Tabs,
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
