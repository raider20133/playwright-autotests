import {expect, type Locator, type Page, type Response} from '@playwright/test';
import type {HttpMethod} from '../api/http';

export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /** The snackbar alert used by the app for success and error notifications. */
    get notification(): Locator {
        return this.page.getByRole('alert');
    }

    /**
     * Runs a UI action and waits for the API call it must trigger. The listener is attached
     * before the action, so a fast response can never be missed.
     */
    protected async expectRequest(
        method: HttpMethod,
        path: string | RegExp,
        status: number,
        action: () => Promise<unknown>,
    ): Promise<Response> {
        const matches = (url: string) => (typeof path === 'string' ? new URL(url).pathname === path : path.test(new URL(url).pathname));
        const [response] = await Promise.all([
            this.page.waitForResponse(res => res.request().method() === method && matches(res.url())),
            action(),
        ]);
        // Firefox and WebKit revalidate repeated GETs with the ETag, so the same data can come back as 304
        const accepted = method === 'GET' && status === 200 ? [200, 304] : [status];
        expect(accepted, `${method} ${response.url()} → ${response.status()}`).toContain(response.status());
        return response;
    }

    /** MUI Select: open the listbox and pick an option by its visible label. */
    protected async choose(select: Locator, option: string): Promise<void> {
        await select.getByRole('combobox').click();
        await this.page.getByRole('option', {name: option, exact: true}).click();
    }
}
