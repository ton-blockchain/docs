/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  singleQuote: true,
  overrides: [
    {
      files: ['*.yml', '*.yaml', '*.py'],
      options: {
        singleQuote: false,
      },
    },
  ],
};

export default config;
