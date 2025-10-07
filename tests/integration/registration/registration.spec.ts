import {test, expect} from '@playwright/test'
import Login from "../../support/login/login";

enum selectors {
    fieldResetUsername = '#«r5»',
    fieldResetPassword = '#«r6»',
    fieldResetSecret = '#«r7»'
}

const username: string = 'Playwright'
const password: string = 'Playwright'
const secret_code: string = 'CHRONOS_SECRET'
let login: Login;

test.beforeEach(async ({page}) => {
    login = new Login(page);
});

test('Sign In', async ({page}) => {
    await page.goto('/')
    await login
        .signIn(username, password)
})

test('Reset Password', async ({page}) => {
    await page.goto('/')
    await page.locator('button:text("Forgot password?")').click()
    await page.locator(selectors.fieldResetUsername).fill(username, {force: true})
    await page.locator(selectors.fieldResetPassword).fill(secret_code, {force: true})
    await page.locator(selectors.fieldResetSecret).fill(password, {force: true})
    await page.locator('button:text("RESET PASSWORD")').click()
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/reset-password') &&
            resp.request().method() === 'POST' &&
            resp.status() === 200
        ),
        await page.locator('button:text("RESET PASSWORD")').click()
    ]);
})