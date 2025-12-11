import {test, expect} from '../../fixtures/fixtures';
import {USER, PASSWORD, SECRET_PASSWORD} from "../../../playwright.config";

/**
 * @enum {string} selectors
 * @description Enumeration of CSS selectors used across the sign-in and password reset forms.
 */
enum selectors {
    /** CSS selector for the username input field in the Password Reset form. */
    fieldResetUsername = '[data-testid="reset-username-input"]',
    /** CSS selector for the new password input field in the Password Reset form. */
    fieldResetPassword = '[data-testid="reset-password-input"]',
    /** CSS selector for the secret code/confirmation field required for password reset. */
    fieldResetSecret = '[data-testid="reset-reg-code-input"]',
    /** CSS selector for the username input field on the Sign-In form. */
    fieldSignInUsername = '[data-testid="username-input"]',
    /** CSS selector for the password input field on the Sign-In form. */
    fieldSignInPassword = '[data-testid="password-input"]',
    /** Selector for the "Forgot password?" link/button to initiate the reset flow. */
    linkToResetPassword = 'button:text("Forgot password?")',
    /** Selector for the submission button on the password reset form. */
    resetPasswordButton = 'button:text("RESET PASSWORD")',
    /** Selector for the submission button on the sign-in form. */
    loginButton = 'button:text("LOGIN")',
}

/**
 * @constant {number} statusCode
 * @description The expected HTTP status code for successful API calls (e.g., successful login or password reset).
 */
const statusCode: number = 200;

/**
 * @describe Test suite for user authentication functionality, covering sign-in, password reset, and error handling.
 */
test.describe('@smoke Registration and checking cases', () => {

    /**
     * @test Checks successful sign-in with valid credentials and verifies authentication completes successfully (HTTP 200).
     * @param {{page: import('@playwright/test').Page, login: any}} object - The Playwright test fixture object containing the page and custom login utilities.
     */
    test('Sign In', async ({page, login}) => {
        await page.goto('/')
        // Use the signIn method from the Login class for authentication
        await login
            .signIn(USER, PASSWORD, statusCode)
    })

    /**
     * @test Checks the successful execution of the password reset flow by navigating to the form, filling fields, and intercepting the successful POST request.
     * @param {{page: import('@playwright/test').Page, interception: any}} object - The Playwright test fixture object containing the page and custom interception utilities.
     */
    test('Reset Password', async ({page, interception}) => {
        await page.goto('/')
        // Navigate to the reset password form
        await page.locator(selectors.linkToResetPassword).click()

        // Fill in the reset password form fields
        await page.locator(selectors.fieldResetUsername).fill(USER)
        await page.locator(selectors.fieldResetSecret).fill(SECRET_PASSWORD)
        await page.locator(selectors.fieldResetPassword).fill(PASSWORD)

        // Submit the form and wait for the successful password reset API response
        await interception
            .interceptions([{
                url: '/api/reset-password',
                method: 'POST',
                statusCode: statusCode
            }], selectors.resetPasswordButton)
    })

    /**
     * @test Checks sign-in behavior with intentionally invalid credentials and verifies the expected unauthorized error status code (401).
     * @param {{page: import('@playwright/test').Page, login: any}} object - The Playwright test fixture object containing the page and custom login utilities.
     */
    test('Invalid data', async ({page, login}) => {
        await page.goto('/')

        // Optional check to ensure all form elements are visible before attempting sign-in
        await expect(page.locator(selectors.fieldSignInUsername)).toBeVisible();
        await expect(page.locator(selectors.fieldSignInPassword)).toBeVisible();
        await expect(page.locator('text=Welcome Back')).toBeVisible();

        // Attempt sign-in with invalid credentials, expecting an Unauthorized (401) status code
        await login
            .signIn('random_invalid_user', 'random_invalid_password', 401)
        // Note: Assertions verifying an error message on the UI could be added here if applicable.
    })
})