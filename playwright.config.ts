import {defineConfig} from '@playwright/test';

const baseURL: string = 'https://managmenttool-front-end.onrender.com/';
export const API_BASE_URL: string = 'https://managmenttool.onrender.com';
export const USERNAME: string = 'Playwright'
export const PASSWORD: string = 'Playwright'

export default defineConfig({
    use: {
        baseURL: baseURL,
        headless: false,
        screenshot: 'only-on-failure',
    },
    testDir: './tests',
    outputDir: './playwright-screenshots',
    timeout: 10 * 2000,
    expect: {timeout: 5000},
    reporter: [['list']],
});
