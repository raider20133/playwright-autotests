import {defineConfig, devices} from '@playwright/test';
import {env} from './src/config/env';

const isCI = !!process.env.CI;

export default defineConfig({
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    // Each parallel slot gets its own QA user, so the worker count is also the size of the user pool
    workers: 3,
    timeout: 45_000,
    expect: {timeout: 8_000},
    globalSetup: './src/setup/global-setup.ts',
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
