import {request} from '@playwright/test';
import {env} from '../config/env';

/**
 * Render's free tier sleeps idle services; the first request can take ~50 s.
 * Wake both apps once here so no test pays for the cold start.
 */
export default async function globalSetup(): Promise<void> {
    const context = await request.newContext();
    const deadline = Date.now() + 120_000;
    try {
        for (const url of [env.apiUrl, env.appUrl]) {
            for (;;) {
                const status = await context.get(url, {timeout: 60_000, failOnStatusCode: false}).then(r => r.status(), () => 0);
                if (status === 200) break;
                if (Date.now() > deadline) throw new Error(`${url} did not come up (last status ${status})`);
                await new Promise(resolve => setTimeout(resolve, 5_000));
            }
        }
    } finally {
        await context.dispose();
    }
}
