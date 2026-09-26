import {defineConfig, devices} from '@playwright/test';
import {env} from './src/config/env';

const isCI = !!process.env.CI;

export default defineConfig({
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    // Kept low on purpose: the app runs on Render's free tier
    workers: 3,
    timeout: 45_000,
    expect: {timeout: 8_000},
    globalSetup: './src/setup/global-setup.ts',
    globalTeardown: './src/setup/global-teardown.ts',
    reporter: [
        ['list'],
        ['html', {open: 'never'}],
        ['allure-playwright', {resultsDir: 'allure-results'}],
        ...(isCI ? [['github'] as ['github']] : []),
    ],
    use: {
        baseURL: env.appUrl,
        locale: 'en-GB',
        timezoneId: 'UTC',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {name: 'api', testDir: './tests/api'},
        {name: 'chromium', testDir: './tests/ui', use: {...devices['Desktop Chrome']}},
        {name: 'firefox', testDir: './tests/ui', use: {...devices['Desktop Firefox']}},
        {name: 'webkit', testDir: './tests/ui', use: {...devices['Desktop Safari']}},
    ],
});
