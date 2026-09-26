// Deletes QA users that were created but never deleted — a cancelled CI job or a Ctrl+C
// kills tests before their fixture teardown runs. Reads the registry the suite writes
// ("+name" on create, "-name" on delete), or takes usernames as arguments.
// Usage: node --env-file=.env scripts/sweep-qa-users.mjs [username...]
import {existsSync, readFileSync, rmSync} from 'node:fs';

export const REGISTRY = process.env.QA_USER_REGISTRY ?? '.qa-users.log';

export function leakedUsers(file = REGISTRY) {
    if (!existsSync(file)) return [];
    const alive = new Set();
    for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (line.startsWith('+')) alive.add(line.slice(1));
        else if (line.startsWith('-')) alive.delete(line.slice(1));
    }
    return [...alive];
}

export async function sweep(usernames, {api = process.env.API_BASE_URL, code = process.env.SECRET_PASSWORD} = {}) {
    if (!api || !code) throw new Error('API_BASE_URL and SECRET_PASSWORD are required');
    const call = (method, path, body, token) => fetch(`${api}${path}`, {
        method,
        headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
        body: JSON.stringify(body),
    });

    let deleted = 0;
    for (const username of usernames) {
        // Only ever touch users the suite owns
        if (!username.startsWith('qa_auto_')) continue;
        const password = `sweep-${Date.now()}`;
        const reset = await call('POST', '/api/reset-password', {username, registrationCode: code, newPassword: password});
        if (reset.status === 404) continue;
        const {token} = await (await call('POST', '/api/login', {username, password})).json();
        const res = await call('DELETE', '/api/users/me', {password}, token);
        if (res.status === 204) deleted += 1;
        else console.warn(`sweep: ${username} → HTTP ${res.status}`);
    }
    return deleted;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const fromArgs = process.argv.slice(2);
    const targets = fromArgs.length ? fromArgs : leakedUsers();
    const deleted = await sweep(targets);
    if (!fromArgs.length) rmSync(REGISTRY, {force: true});
    console.log(`sweep: ${deleted} of ${targets.length} leftover QA users deleted`);
}
