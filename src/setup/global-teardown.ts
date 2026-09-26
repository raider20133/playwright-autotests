import {env} from '../config/env';
// @ts-expect-error plain JS helper shared with the CI cleanup step
import {leakedUsers, sweep, REGISTRY} from '../../scripts/sweep-qa-users.mjs';
import {rmSync} from 'node:fs';

/** Safety net: normally every test deletes its own user and this finds nothing. */
export default async function globalTeardown(): Promise<void> {
    const leaked = leakedUsers();
    if (leaked.length) {
        const deleted = await sweep(leaked, {api: env.apiUrl, code: env.registrationCode});
        console.warn(`global teardown: swept ${deleted} QA users that tests did not delete`);
    }
    rmSync(REGISTRY, {force: true});
}
