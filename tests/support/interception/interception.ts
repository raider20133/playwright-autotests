import {Page} from '@playwright/test';

/**
 * @typedef {object} Intercept
 * @property {string} url - The URL part to match (e.g., '/api/users').
 * @property {string} method - The HTTP method to match (e.g., 'GET', 'POST', 'PUT').
 * @property {number} statusCode - The expected HTTP status code of the response (e.g., 200, 201).
 */
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
     * @param {string | (() => Promise<void>) | false} [clickAction] - The action to perform after setting up listeners:
     * - `string`: A selector for an element to click.
     * - `function`: An asynchronous function containing the action (e.g., clicking a button).
     * - `false` or `undefined`: No action is performed (useful if the action is triggered externally).
     * @returns {Promise<this>} The current Interception instance for method chaining.
     */
    async interceptions(intercepts: Intercept[], clickAction?: string): Promise<this> {
        // Create an array of promises, one for each expected response
        const responses = intercepts.map(({url, method, statusCode}) =>
            this.page.waitForResponse(resp =>
                resp.url().includes(url) && // Check if the URL contains the specified part
                resp.request().method() === method && // Check the HTTP method
                resp.status() === statusCode // Check the status code
            )
        );

        // Execute the click/action if provided
        await this.page.locator(clickAction).click();

        // Now, wait for all the API responses to be received
        await Promise.all(responses);
        return this;
    }
}


export default Interception;