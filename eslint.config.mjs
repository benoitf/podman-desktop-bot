/**********************************************************************
 * Copyright (C) 2024 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import globals from 'globals';
import js from '@eslint/js';
import typescriptLint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { FlatCompat } from '@eslint/eslintrc';
import unicorn from 'eslint-plugin-unicorn';
import noNull from 'eslint-plugin-no-null';
import sonarjs from 'eslint-plugin-sonarjs';
import etc from 'eslint-plugin-etc';
import redundantUndefined from 'eslint-plugin-redundant-undefined';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '*.config.*js',
      '**/*.config.*js',
      '**/dist/**/*',
      '**/test-resources',
      '**/__mocks__/',
      '**/coverage/',
      'packages/backend/media/**',
      'scripts/**',
      '**/src-generated/',
    ],
  },
  js.configs.recommended,
  ...typescriptLint.configs.recommended,
  sonarjs.configs.recommended,
  ...fixupConfigRules(
    compat.extends('plugin:import/recommended', 'plugin:import/typescript', 'plugin:etc/recommended'),
  ),
  {
    plugins: {
      // compliant v9 plug-ins
      unicorn,
      // non-compliant v9 plug-ins
      etc: fixupPluginRules(etc),
      import: fixupPluginRules(importPlugin),
      'no-null': fixupPluginRules(noNull),
      'redundant-undefined': fixupPluginRules(redundantUndefined),
      'simple-import-sort': fixupPluginRules(simpleImportSort),
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,

        'eslint-import-resolver-custom-alias': {
          alias: {
            '/@': './src',
            '/@gen': './src-generated',
          },

          extensions: ['.ts'],
          packages: ['packages/*'],
        },
      },
    },
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
      // parser: tsParser,
      sourceType: 'module',
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
        project: ['./tsconfig.json'],
      },
    },
  },
  {
    rules: {
      eqeqeq: 'error',
      'prefer-promise-reject-errors': 'error',
      semi: ['error', 'always'],
      'comma-dangle': ['warn', 'always-multiline'],

      quotes: [
        'error',
        'single',
        {
          allowTemplateLiterals: true,
        },
      ],

      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        {
          ignoreConditionalTests: true,
        },
      ],
      '@typescript-eslint/no-require-imports': 'off',

      // unicorn custom rules
      'unicorn/prefer-node-protocol': 'error',

      'no-null/no-null': 'error',
      'sonarjs/no-empty-function': 'off',
      'sonarjs/deprecation': 'off',
      'sonarjs/todo-tag': 'off',
      'sonarjs/sonar-no-fallthrough': 'off',

      /**
       * Having a semicolon helps the optimizer interpret your code correctly.
       * This avoids rare errors in optimized code.
       * @see https://twitter.com/alex_kozack/status/1364210394328408066
       */
      semi: ['error', 'always'],
      /**
       * This will make the history of changes in the hit a little cleaner
       */
      'comma-dangle': ['warn', 'always-multiline'],
      /**
       * Just for beauty
       */
      quotes: ['error', 'single', { allowTemplateLiterals: true }],

      // disabled import/namespace rule as the plug-in is not fully compatible using the compat mode
      'import/namespace': 'off',
      'import/no-duplicates': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-extraneous-dependencies': 'error',
      'import/no-unresolved': 'off',
      'import/default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-named-as-default': 'off',
      'sonarjs/cognitive-complexity': 'off',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-empty-collection': 'off',
      'sonarjs/no-small-switch': 'off',
      'etc/no-commented-out-code': 'error',
      'etc/no-deprecated': 'off',
      'etc/no-commented-out-code': 'off',
      'redundant-undefined/redundant-undefined': 'error',
      'import/no-extraneous-dependencies': 'error',
    },
  },


];