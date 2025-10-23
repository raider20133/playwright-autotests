import {Page, Response} from '@playwright/test';

type Intercept = {
    url: string;
    method: string;
    statusCode: number;
};

/**
 * @class
 * @classdesc A utility class for setting up API request/response interceptions and waiting for them after an action.
 */
class Interception {
    /**
     * @private
     * @type {Page}
     * @description The Playwright Page object used to interact with the browser and set up listeners.
     */
    private page: Page;

    /**
     * @constructor
     * @param {Page} page - The Playwright Page object instance.
     */
    constructor(page: Page) {
        this.page = page;
    }

    /**
     * @async
     * @method interceptions
     * @description Sets up listeners for multiple expected API responses, executes an action, and waits for all responses.
     * @param {Intercept[]} intercepts - An array of objects defining the expected API responses.
     * @param {string | (() => Promise<void>)} clickAction - Selector or function to trigger the request
     * @param {boolean} [waitForResponses=true] - Whether to wait for and return responses (true) or just ensure requests complete (false)
     * @returns {Promise<Response[] | this>} Array of responses if waitForResponses=true, otherwise returns this for chaining
     */
    async interceptions(
        intercepts: Intercept[],
        clickAction?: string,
        waitForResponses: boolean = false
    ): Promise<Response[] | this> {
        // Create an array of promises, one for each expected response
        const responsePromises: Promise<Response>[] = intercepts.map(({url, method, statusCode}) =>
            this.page.waitForResponse(resp =>
                resp.url().includes(url) &&
                resp.request().method() === method &&
                resp.status() === statusCode
            )
        );

        if (clickAction) {
            await this.page.locator(clickAction).click();
        }
        // If we need to work with responses, wait and return them
        if (waitForResponses) {
            return await Promise.all(responsePromises);
        }

        // Otherwise, just wait for completion without returning (fire-and-forget style)
        await Promise.all(responsePromises);
        return this;
    }
}

export default Interception;