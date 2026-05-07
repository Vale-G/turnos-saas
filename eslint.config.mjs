import eslint from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettierPlugin from 'eslint-plugin-prettier';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  {
    // Installs the parser and plugin without requiring any configuration.
    // We're using the "core" config, which includes the Next.js specific
    // rules that are not performance-related.
    // https://nextjs.org/docs/app/building-your-application/configuring/eslint#core-configuration
    ...nextPlugin.configs.core,
  },
  {
    // This is the "recommended" configuration that we're extending.
    // https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/src/configs/recommended-type-checked.ts
    ...tsEslint.configs.recommendedTypeChecked,
  },
  {
    // This is the "recommended" configuration that we're extending.
    // https://github.com/eslint/eslint/blob/main/packages/js/src/configs/eslint-recommended.js
    ...eslint.configs.recommended,
  },
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // This is the "recommended" configuration that we're extending.
      // https://github.com/prettier/eslint-plugin-prettier/blob/master/recommended.js
      ...prettierPlugin.configs.recommended.rules,
    },
  },
  {
    // Turn off rules that are no longer necessary or that conflict with Prettier.
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // Ignore config files.
    ignores: ['*.mjs', '*.js'],
  },
);
