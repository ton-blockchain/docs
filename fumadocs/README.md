# fumadocs

Next.js app with [Static Export](https://nextjs.org/docs/app/guides/static-exports) configured.

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
- `app/layout.tsx`: Root layout with `DocsLayout` being the default.
- `app/[[...slug]]/page.tsx`: Catch-all docs page with `/` from `content/index.mdx`.
- `app/api/search/route.ts`: The Route Handler for search.

In the `source.config.ts` config, one can customize different options like frontmatter schema. Read the [introduction guide](https://fumadocs.dev/docs/mdx) for details.

## Learn more

To learn more about Next.js and Fumadocs, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Fumadocs](https://fumadocs.dev) - learn about Fumadocs
