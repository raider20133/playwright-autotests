// One-off: deletes the pooled QA users left by the previous version of the suite
// (qa_auto_<project>_<role>_<slot>) and the manual probe user. Safe to rerun.
// Usage: node --env-file=.env scripts/delete-legacy-qa-users.mjs
const api = process.env.API_BASE_URL;
const code = process.env.SECRET_PASSWORD;
if (!api || !code) throw new Error('API_BASE_URL and SECRET_PASSWORD are required');

const names = ['qa_auto_probe'];
for (const project of ['api', 'chromium', 'firefox', 'webkit'])
    for (const role of ['owner', 'peer'])
        for (let slot = 0; slot < 8; slot++) names.push(`qa_auto_${project}_${role}_${slot}`);

const post = (path, body, token, method = 'POST') => fetch(`${api}${path}`, {
    method,
    headers: {'Content-Type': 'application/json', ...(token ? {Authorization: `Bearer ${token}`} : {})},
    body: JSON.stringify(body),
});

let deleted = 0;
for (const username of names) {
    const password = `cleanup-${Date.now()}`;
    const reset = await post('/api/reset-password', {username, registrationCode: code, newPassword: password});
    if (reset.status === 404) continue;
    const {token} = await (await post('/api/login', {username, password})).json();
    const res = await post('/api/users/me', {password}, token, 'DELETE');
    console.log(`${username}: ${res.status === 204 ? 'deleted' : `HTTP ${res.status}`}`);
    if (res.status === 204) deleted += 1;
}
console.log(`Done, ${deleted} users deleted.`);
