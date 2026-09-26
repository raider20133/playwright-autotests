// Builds a Markdown run summary from allure-results: one row per Playwright project,
// plus the failed tests. Used for the GitHub job summary and the Telegram message.
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const dir = process.argv[2] ?? 'allure-results';
const format = process.argv[3] ?? 'github';

const results = readdirSync(dir)
    .filter(f => f.endsWith('-result.json'))
    .map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));

// A retried test writes one result per attempt; keep the last attempt only
const latest = new Map();
for (const r of results) {
    const prev = latest.get(r.historyId);
    if (!prev || r.stop > prev.stop) latest.set(r.historyId, r);
}

const label = (r, name) => r.labels?.find(l => l.name === name)?.value;
const byProject = new Map();
for (const r of latest.values()) {
    const project = label(r, 'parentSuite') ?? 'unknown';
    const row = byProject.get(project) ?? {passed: 0, failed: 0, skipped: 0};
    if (r.status === 'passed') row.passed += 1;
    else if (r.status === 'skipped') row.skipped += 1;
    else row.failed += 1;
    byProject.set(project, row);
}

const failed = [...latest.values()].filter(r => r.status === 'failed' || r.status === 'broken');
const total = [...byProject.values()].reduce((a, r) => ({passed: a.passed + r.passed, failed: a.failed + r.failed, skipped: a.skipped + r.skipped}), {passed: 0, failed: 0, skipped: 0});
const reportUrl = process.env.REPORT_URL;

if (format === 'telegram') {
    const lines = [
        `${failed.length ? '❌' : '✅'} *Chronos autotests* — ${total.passed} passed, ${total.failed} failed, ${total.skipped} skipped`,
        ...[...byProject].map(([p, r]) => `• ${p}: ${r.passed}✅ ${r.failed}❌`),
        ...failed.slice(0, 10).map(r => `\n*${label(r, 'parentSuite')}* ${r.name.replace(/[*_`[\]]/g, ' ')}`),
    ];
    if (reportUrl) lines.push(`\n[Allure report](${reportUrl})`);
    console.log(lines.join('\n'));
} else {
    const lines = [
        `## ${failed.length ? '❌' : '✅'} ${total.passed} passed · ${total.failed} failed · ${total.skipped} skipped`,
        '',
        '| Project | Passed | Failed | Skipped |',
        '|---|---:|---:|---:|',
        ...[...byProject].sort().map(([p, r]) => `| ${p} | ${r.passed} | ${r.failed} | ${r.skipped} |`),
    ];
    if (failed.length) lines.push('', '### Failed', ...failed.map(r => `- **${label(r, 'parentSuite')}** — ${r.fullName ?? r.name}`));
    if (reportUrl) lines.push('', `[Allure report](${reportUrl})`);
    console.log(lines.join('\n'));
}
