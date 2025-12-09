import {defineConfig} from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({override: true});

const baseURL: string = process.env.BASE_URL;
export const API_BASE_URL: string = process.env.API_BASE_URL;
export const USER: string = process.env.USER
export const PASSWORD: string = process.env.PASSWORD
export const SECRET_PASSWORD: string = process.env.SECRET_PASSWORD

export default defineConfig({
    testDir: './tests',
    outputDir: './playwright-screenshots',
    timeout: 10 * 2000,
    expect: {timeout: 5000},
    reporter: [['list'], ['html'],['allure-playwright']],

    // Common settings for all projects
    use: {
        baseURL: baseURL,
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'on-first-retry',
    },

    // Configure projects for major browsers
    projects: [
        {
            name: 'chromium',
            use: {
                browserName: 'chromium',
            },
        },
        {
            name: 'firefox',
            use: {
                browserName: 'firefox',
            },
        },
        {
            name: 'webkit',
            use: {
                browserName: 'webkit',
            },
        },
    ],
});

