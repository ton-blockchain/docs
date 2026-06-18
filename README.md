# TON Docs

Next.js app running [Fumadocs](https://www.fumadocs.dev/docs) documentation framework, with [Static Export](https://nextjs.org/docs/app/guides/static-exports) configured.

All documentation pages are kept in the `content/` folder.

## Development

Install necessary dependencies:

```shell
npm ci
```

To start a local preview, run the following command at the root of the documentation:

```shell
npm start
```

View the local preview at `http://localhost:3000`. Starting a local preview at least once is required for regenerating the `.source/` folder, contents of which is used in certain files in the `src/` directory.

> \[!IMPORTANT]
> Around 8 GiB of free RAM space is needed for local previews to run.

### Spell checks

> \[!NOTE]
> Automatic spelling checks are performed for changed files in each Pull Request.

To check spelling of **all** files, run:

```shell
npm run check:spell

# or simply:

npm run spell
```

To check spelling of some **selected** files, run:

```shell
npm run spell:some <FILES...>
```

#### Adding new words to the spellchecking dictionary

The dictionaries (or vocabularies) for custom words are placed under `public/dictionaries`. There, each dictionary describes additional allowed or invalid entries.

The primary dictionary is `public/dictionaries/custom.txt` — extend it in case a word exists in American English but was flagged by CSpell as invalid, or in cases where the word does not exist and shall be prohibited. For the latter, add words to `public/dictionaries/ban.txt` with the `!` prefix when there are no clear correct replacements.

If an existing two-letter word was flagged as forbidden, remove it from the `public/dictionaries/two-letter-words-ban.txt` file. However, if a word happened to be a part of a bigger word, e.g., `CL` in `OpenCL`, do not ban it and instead add the bigger word to the primary dictionary in `public/dictionaries/custom.txt`.

See more: [CSpell docs on custom dictionaries](https://cspell.org/docs/dictionaries/custom-dictionaries).

### Format checks

> \[!NOTE]
> Automatic formatting checks are performed for changed files in each Pull Request.

To check formatting of **all** files, run:

```shell
npm run check:fmt
```

To fix formatting of **all** files, run:

```shell
npm run fmt
```

To check and fix formatting of some **selected** files, run:

```shell
npm run fmt:some <FILES...>
```

## Using components and snippets

See the [`snippets/` directory](./snippets) and the corresponding docs in [`content/contribute/snippets/` MDX files](./content/contribute/snippets/).

## Publishing changes

The [GitHub Pages](https://docs.github.com/en/pages) deployment is set up — changes are deployed to production automatically after pushing to the default branch (`main`).

## Need help?

### Troubleshooting

- If the dev environment is not running: Run `npm ci` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure the page exists under the `content/` directory and is not hidden in respective `meta.json` file on its depth level.

### Resources

- [Fumadocs documentation](https://fumadocs.dev/docs)
- [Fumadocs GitHub](https://github.com/fuma-nama/fumadocs)
- [Next.js documentation](https://nextjs.org/docs)
- [Interactive Next.js tutorial](https://nextjs.org/learn).

## License

This project is dual-licensed:

- All documentation and non-code text are licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- All code snippets are licensed under [MIT](https://opensource.org/license/mit)
