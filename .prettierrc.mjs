/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  singleQuote: true,
  printWidth: 100,
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
