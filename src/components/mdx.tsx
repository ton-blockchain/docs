import type { MDXComponents } from 'mdx/types';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { APIPage } from '@/components/api-page';
import { ImageZoom } from '@/components/mdx/image-zoom';
import { Mermaid } from '@/components/mdx/mermaid';
import { File, Files, Folder } from '@/components/mdx/files';
import { Accordion, Accordions } from '@/components/mdx/accordion';
import { Tabs, Tab, CodeGroup } from '@/components/mdx/tabs';
import { Callout } from '@/components/mdx/callout';
import { Image } from '@/components/mdx/image';
import { Stub } from '@/components/mdx/stub';
import { FileTree } from '@/components/mdx/filetree';
import { Icon } from '@/components/mdx/icon';
import { Card, Cards, Columns } from '@/components/mdx/card';
import { Step, Steps } from '@/components/mdx/steps';
import { Badge } from '@/components/mdx/badge';
// Page-specific components
import { CatchainVisualizer } from '@/snippets/catchain-visualizer';
import { TvmInstructionTable } from '@/snippets/tvm-instruction-table';
import { ParamField, ResponseField, Tooltip } from '@/snippets/stub-components';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // See: https://www.fumadocs.dev/docs/ui/components/image-zoom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    img: (props) => <ImageZoom {...(props as any)} />,
    // See: https://www.fumadocs.dev/docs/integrations/openapi/api-page
    APIPage,
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
    CodeGroup,
    // See: https://www.fumadocs.dev/docs/ui/components/steps
    // See: https://www.fumadocs.dev/docs/headless/mdx/remark-steps
    Step,
    Steps,
    // Slightly modified Callout component:
    // https://github.com/fuma-nama/fumadocs/blob/db93ebdf6d73424001f1602509eb7f845f990f02/packages/base-ui/src/components/callout.tsx
    Callout,
    // Overridden Card-related components with extended set of props and features
    Card,
    Cards,
    Columns,
    // Custom components
    Image,
    Stub,
    FileTree,
    Icon,
    Badge,
    // Page-specific components that require complex React state management or imports.
    // Other page-specific components should be placed in /snippets and imported directly on the target page.
    CatchainVisualizer,
    TvmInstructionTable,
    // NOTE: dummy or shim components
    ParamField,
    ResponseField,
    Tooltip,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
