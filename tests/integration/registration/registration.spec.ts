import {test, expect} from '@playwright/test'
// Assuming Login class is available from this path.
import Login from "../../support/login/login";

/**
 * @enum {string} selectors
 * @description Enumeration of CSS selectors used across the login and password reset forms.
 */
enum selectors {
    /** CSS selector for the username field in the password reset form. */
    fieldResetUsername = '#«r5»',
    /** CSS selector for the new password field in the password reset form. */
    fieldResetPassword = '#«r6»',
    /** CSS selector for the secret code/confirmation field in the password reset form. */
    fieldResetSecret = '#«r7»',
    /** CSS selector for the username field in the sign-in form. */
    fieldSignInUsername = '#«r2»',
    /** CSS selector for the password field in the sign-in form. */
    fieldSignInPassword = '#«r3»'
}

/**
 * @constant {string} username
 * @description The standard valid username used for testing.
 */
const username: string = 'Playwright'

/**
 * @constant {string} password
 * @description The standard valid password used for testing.
 */
const password: string = 'Playwright'

/**
 * @constant {string} secret_code
 * @description The secret code or new password used for the password reset test case.
 */
const secret_code: string = 'CHRONOS_SECRET'

/**
 * @constant {number} statusCode
 * @description The expected HTTP status code for successful API calls (e.g., login, reset).
 */
const statusCode: number = 200;

/**
 * @type {Login}
 * @description An instance of the Login class to handle sign-in operations.
 */
let login: Login;

/**
 * @description Initializes the Login object before each test.
 * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
 */
test.beforeEach(async ({page}) => {
    login = new Login(page);
});

/**
 * @describe Test suite for user registration, sign-in, and checking various login cases.
 */
test.describe('Registration and checking cases', () => {

    /**
     * @test Checks successful sign-in with valid credentials.
     * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Sign In', async ({page}) => {
        await page.goto('/')
        // Use the signIn method from the Login class for authentication
        await login
            .signIn(username, password, statusCode)
    })

    /**
     * @test Checks the successful execution of the password reset flow.
     * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Reset Password', async ({page}) => {
        await page.goto('/')
        await page.locator('button:text("Forgot password?")').click()

        // Fill in the reset password form fields
        await page.locator(selectors.fieldResetUsername).fill(username)
        await page.locator(selectors.fieldResetPassword).fill(secret_code) // new password
        await page.locator(selectors.fieldResetSecret).fill(password)      // secret code

        // Wait for the API response and click the RESET PASSWORD button concurrently
        await Promise.all([
            page.waitForResponse(resp =>
                resp.url().includes('/api/reset-password') &&
                resp.request().method() === 'POST' &&
                resp.status() === statusCode
            ),
            page.locator('button:text("RESET PASSWORD")').click()
        ]);
    })

    /**
     * @test Checks sign-in behavior with invalid data and verifies the expected error status code.
     * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Invalid data', async ({page}) => {
        await page.goto('/')

        // Check that the initial login form elements are visible before attempting sign-in
        await page.locator('button:text("LOGIN")').click() // Optional: May be needed to ensure form is fully rendered/visible
        await expect(page.locator(selectors.fieldSignInUsername)).toBeVisible();
        await expect(page.locator(selectors.fieldSignInPassword)).toBeVisible();
        await expect(page.locator('text=Welcome Back')).toBeVisible();

        // Attempt sign-in with invalid credentials, expecting an Unauthorized (401) status code
        await login
            .signIn('random', 'random', 401)
        // Note: Additional assertions for error messages on the UI (if any) could be added here.
    })
})