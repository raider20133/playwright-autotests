import {Page} from '@playwright/test';

/**
 * @enum {string} selectors
 * @description Enumeration of CSS selectors used for login elements.
 */
enum selectors {
    /** CSS selector for the username input field on the sign-in form. */
    fieldSignInUsername = '#«r2»',
    /** CSS selector for the password input field on the sign-in form. */
    fieldSignInPassword = '#«r3»'
}

/**
 * @class
 * @classdesc Represents the Login page or component, providing methods for user authentication.
 */
class Login {
    /**
     * @type {Page}
     * @description The Playwright Page object used to interact with the browser.
     * @readonly
     */
    readonly page: Page;

    /**
     * @constructor
     * @param {Page} page - The Playwright Page object instance.
     */
    constructor(page: Page) {
        this.page = page;
    }

    /**
     * @async
     * @method signIn
     * @description Fills the username and password fields, clicks the login button, and waits for the authentication API response.
     * @param {string} username - The username to enter.
     * @param {string} password - The password to enter.
     * @param {number} statusCode - The expected HTTP status code of the login API response (e.g., 200 for success).
     * @returns {Promise<this>} The current Login instance for method chaining.
     */
    async signIn(username: string, password: string, statusCode: number): Promise<this> {
        // Fill username and password fields
        await this.page.locator(selectors.fieldSignInUsername).fill(username)
        await this.page.locator(selectors.fieldSignInPassword).fill(password)

        // Wait for the login API response (POST to /api/login) with the expected status code,
        // and concurrently click the LOGIN button.
        await Promise.all([
            this.page.waitForResponse(resp =>
                resp.url().includes('/api/login') &&
                resp.request().method() === 'POST' &&
                resp.status() === statusCode
            ),
            this.page.locator('button:text("LOGIN")').click()
        ]);
        return this;
    }
}

export default Login;