import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { ImageZoom } from '@/components/mdx/image-zoom';
import { Mermaid } from '@/components/mdx/mermaid';
import { File, Files, Folder } from '@/components/mdx/files';
import { Accordion, Accordions } from '@/components/mdx/accordion';
import { Tabs, Tab } from '@/components/mdx/tabs';
import { Image } from '@/components/mdx/image';
import { Stub } from '@/components/mdx/stub';
import { Callout } from '@/components/mdx/callout';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
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
    // Slightly modified Callout component:
    // https://github.com/fuma-nama/fumadocs/blob/db93ebdf6d73424001f1602509eb7f845f990f02/packages/base-ui/src/components/callout.tsx
    Callout,
    // Custom components
    Image,
    Stub,
    // TODO: cards, card, AvailabilityBadge, APIPage,
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
