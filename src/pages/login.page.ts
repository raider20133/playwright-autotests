import {expect, type Locator} from '@playwright/test';
import {BasePage} from './base.page';

export class LoginPage extends BasePage {
    readonly heading: Locator = this.page.getByText('Welcome Back');
    readonly username: Locator = this.page.getByTestId('username-input');
    readonly password: Locator = this.page.getByTestId('password-input');
    readonly submit: Locator = this.page.getByTestId('login-button');
    readonly forgotPassword: Locator = this.page.getByRole('button', {name: 'Forgot password?'});

    async open(): Promise<void> {
        await this.page.goto('/');
        await expect(this.heading).toBeVisible();
    }

    async login(username: string, password: string, expectedStatus = 200): Promise<void> {
        await this.username.fill(username);
        await this.password.fill(password);
        await this.expectRequest('POST', '/api/login', expectedStatus, () => this.submit.click());
    }

    async resetPassword(username: string, registrationCode: string, newPassword: string, expectedStatus = 200): Promise<void> {
        await this.forgotPassword.click();
        await this.page.getByTestId('reset-username-input').fill(username);
        await this.page.getByTestId('reset-reg-code-input').fill(registrationCode);
        await this.page.getByTestId('reset-password-input').fill(newPassword);
        await this.expectRequest('POST', '/api/reset-password', expectedStatus, () =>
            this.page.getByTestId('reset-password-button').click());
    }
}
