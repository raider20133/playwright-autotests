import type {APIRequestContext} from '@playwright/test';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResponse {
    method: HttpMethod;
    url: string;
    status: number;
    body: unknown;
}

export interface SendOptions {
    data?: unknown;
    params?: Record<string, string | number | boolean>;
    /** Override the client's token: a string sends it as-is, null sends no Authorization header. */
    token?: string | null;
}

/**
 * Thin wrapper over APIRequestContext. It never throws on HTTP errors — tests assert
 * the status explicitly, so negative cases read the same way as positive ones.
 */
export class BaseApi {
    constructor(
        protected readonly http: APIRequestContext,
        private readonly token?: string,
    ) {}

    protected async send(method: HttpMethod, path: string, options: SendOptions = {}): Promise<ApiResponse> {
        const token = options.token === undefined ? this.token : options.token;
        const response = await this.http.fetch(path, {
            method,
            data: options.data,
            params: options.params,
            headers: token ? {Authorization: `Bearer ${token}`} : {},
            failOnStatusCode: false,
        });
        const text = await response.text();
        let body: unknown = text || null;
        try {
            body = text ? JSON.parse(text) : null;
        } catch {
            // Non-JSON bodies (e.g. "Forbidden") stay as text
        }
        return {method, url: response.url(), status: response.status(), body};
    }
}
