import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
    {ignores: ['node_modules', 'playwright-report', 'test-results', 'allure-*']},
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {globals: {process: 'readonly', console: 'readonly'}},
    },
    {
        ...playwright.configs['flat/recommended'],
        files: ['tests/**/*.ts'],
        rules: {
            ...playwright.configs['flat/recommended'].rules,
            'playwright/no-wait-for-timeout': 'error',
            'playwright/no-force-option': 'error',
            'playwright/prefer-web-first-assertions': 'error',
            // Assertions also live in API helpers (expectStatus, expectContract...) and page objects
            'playwright/expect-expect': ['error', {assertFunctionPatterns: ['^expect[A-Z]', '\\.expect[A-Z]\\w*$']}],
        },
    },
);
