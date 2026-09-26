const pad = (n: number) => String(n).padStart(2, '0');

/** First day of the month, relative to the current one, as the API expects it: "YYYY-MM-01". */
export function monthStart(offset = 0, from = new Date()): string {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + offset, 1));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}

/** A calendar date "YYYY-MM-DD", `days` from today. */
export function isoDay(days = 0, from = new Date()): string {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + days));
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Same formatting the UI uses for leave dates (browser runs with en-GB locale, UTC timezone). */
export function uiDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {timeZone: 'UTC'});
}
