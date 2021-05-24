# TON Documentation

This repository is documentation for the [TON Blockchain](https://toncoin.org).

The **deployed** version of this documentation is available at:

- https://docs.toncoin.org/

## gatsby-theme-apollo-docs

This site uses [gatsby-theme-apollo-docs](https://github.com/apollographql/gatsby-theme-apollo/tree/master/packages/gatsby-theme-apollo-docs).

1. Install required dependencies

### Setup

#### `.env`

If you are going to build and update site indexing for Algolia, you will need to save the `env-template` file as `.env` locally and populate the variable values. Currently, we only use environment values for Algolia search.

#### node

Node versions this repo has been successfully been run and tested with: 10.22.1, 12.19.0

### Running

- `yarn install` to install dependencies
- `yarn start` to launch local server
- Open a browser to the link provided in the console

## Deployment

This site uses [Algolia search](https://algolia.com) which requires the environment variables from `env-template`.

## Troubleshooting

Gatsby and react often results in conflicts. If you have errors running `npm start` or `gatsby develop`:

- you may need to try to uninstall and reinstall `react`, `react-dom`, and `gatsby` ([reference](https://github.com/gatsbyjs/gatsby/issues/19827#issuecomment-573986378))
- you can also try `yarn install` instead of `npm install`

**Note**: Use `master` as base branch
