import {Page} from '@playwright/test';

enum selectors{
    fieldSignInUsername='#«r2»',
    fieldSignInPassword = '#«r3»',
}

class Login {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async signIn(username: string, password: string): Promise<this> {
        await this.page.locator(selectors.fieldSignInUsername).fill(username, {force: true})
        await this.page.locator(selectors.fieldSignInPassword).fill(password, {force: true})
        await Promise.all([
            this.page.waitForResponse(resp =>
                resp.url().includes('/api/login') &&
                resp.request().method() === 'POST' &&
                resp.status() === 200
            ),
            await this.page.locator('button:text("LOGIN")').click()
        ]);
        return this;
    }
}

export default Login;