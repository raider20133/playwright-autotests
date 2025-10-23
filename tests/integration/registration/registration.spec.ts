import {test, expect} from '@playwright/test'
// Assuming Login class is available from this path.
import Login from "../../support/login/login";
import Interception from "../../support/interception/interception";
import {USER, PASSWORD, SECRET_PASSWORD} from "../../../playwright.config";

/**
 * @enum {string} selectors
 * @description Enumeration of CSS selectors used across the login and password reset forms.
 */
enum selectors {
    /** CSS selector for the username field in the password reset form. */
    fieldResetUsername = '[data-testid="reset-username-input"]',
    /** CSS selector for the new password field in the password reset form. */
    fieldResetPassword = '[data-testid="reset-password-input"]',
    /** CSS selector for the secret code/confirmation field in the password reset form. */
    fieldResetSecret = '[data-testid="reset-reg-code-input"]',
    /** CSS selector for the username input field on the sign-in form. */
    fieldSignInUsername = '[data-testid="username-input"]',
    /** CSS selector for the password input field on the sign-in form. */
    fieldSignInPassword = '[data-testid="password-input"]',
    linkToResetPassword = 'button:text("Forgot password?")',
    resetPasswordButton = 'button:text("RESET PASSWORD")',
    loginButton = 'button:text("LOGIN")',
}

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
let interception: Interception
/**
 * @description Initializes the Login object before each test.
 * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
 */
test.beforeEach(async ({page}) => {
    login = new Login(page);
    interception = new Interception(page)
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
            .signIn(USER, PASSWORD, statusCode)
    })

    /**
     * @test Checks the successful execution of the password reset flow.
     * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Reset Password', async ({page}) => {
        await page.goto('/')
        await page.locator(selectors.linkToResetPassword).click()

        // Fill in the reset password form fields
        await page.locator(selectors.fieldResetUsername).fill(USER)
        await page.locator(selectors.fieldResetSecret).fill(SECRET_PASSWORD)
        await page.locator(selectors.fieldResetPassword).fill(PASSWORD)
        await interception
            .interceptions([{
                url: '/api/reset-password',
                method: 'POST',
                statusCode: statusCode
            }], selectors.resetPasswordButton)
    })

    /**
     * @test Checks sign-in behavior with invalid data and verifies the expected error status code.
     * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Invalid data', async ({page}) => {
        await page.goto('/')

        // Check that the initial login form elements are visible before attempting sign-in
        await page.locator(selectors.loginButton).click() // Optional: May be needed to ensure form is fully rendered/visible
        await expect(page.locator(selectors.fieldSignInUsername)).toBeVisible();
        await expect(page.locator(selectors.fieldSignInPassword)).toBeVisible();
        await expect(page.locator('text=Welcome Back')).toBeVisible();

        // Attempt sign-in with invalid credentials, expecting an Unauthorized (401) status code
        await login
            .signIn('random', 'random', 401)
        // Note: Additional assertions for error messages on the UI (if any) could be added here.
    })
})