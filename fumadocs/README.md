# fumadocs

Next.js app with [Static Export](https://nextjs.org/docs/app/guides/static-exports) configured.

The plan:

- Gradually move all pages
  - Add required components
    - Port Aside -> replace with Callouts or have a mapping
    - Port Image -> combine with img or ImageZoom
    - Port FileTree -> map onto existing components
    - Port Icon: this should include fontawesome icons port too
    - Port Cards
    - Port other Mintlify components in use (`<[A-Z]`)
    - When porting per-page custom components, adjust their styles
  - Use Inter font, use brand colors, use TON logo
  - Add enhancements made in `ton-blockchain/acton`
  - Add some enhancements made in `the-ton-tech/ton-docs-private`
  - Fix issues with styles and etc.
- Gradually move prior top-level setup
  - `resources`
  - `scripts`
  - `components` (what's left of them after the previous step)
  - `.github/`
- Once things are running smoothly under Fumadocs, replace top-level contents with Fumadocs
  - Before that happens, top-level contents shall stay untouched!

Stronger structural changes and enhancements should be done afterward as they are too tricky to work on in parallel. Unfinished and unpolished structural changes shall not be published to end-users as that would break their workflows.

## Get started

Install dependencies:

```bash
bun ci
```

Run development server with the following command:

```bash
bun run dev
```

Open hetp://localhost:3000 with the browser.

## Explore

- `lib/source.ts`: code for content source adapter, [`loader()`](https://fumadocs.dev/docs/headless/source-api) provides the interface to access content.
- `lib/layout.shared.tsx`: shared options for layouts, optional but preferred to keep.
- `app/layout.tsx`: root layout with `DocsLayout` being the default.
- `app/[[...slug]]/page.tsx`: catch-all docs page with `/` from `content/index.mdx`.
- `app/api/search/route.ts`: route handler for the search.

In the `source.config.ts` config, one can customize different options like frontmatter schema. Read the [introduction guide](https://fumadocs.dev/docs/mdx) for details.

## Learn more

To learn more about Next.js and Fumadocs, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.dev) - learn about Fumadocs
