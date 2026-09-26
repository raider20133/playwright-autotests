import {test, expect} from '@src/fixtures';
import {env} from '@src/config/env';

test.describe('Sign in', {tag: '@ui'}, () => {
    test.use({authenticated: false});

    test('a user signs in and lands in the app', {tag: '@smoke'}, async ({loginPage, app, qaUser}) => {
        await loginPage.open();
        await loginPage.login(qaUser.username, qaUser.password);
        await app.expectSignedIn();
    });

    test('wrong credentials show an error and keep the user on the sign-in form', async ({loginPage, qaUser}) => {
        await loginPage.open();
        await loginPage.login(qaUser.username, 'wrong-password', 401);

        await expect(loginPage.notification).toContainText('Invalid credentials');
        await expect(loginPage.heading).toBeVisible();
    });

    test('a user resets the password and signs in with the new one', async ({loginPage, app, qaUser}) => {
        const newPassword = `${qaUser.password}-ui`;
        await loginPage.open();
        await loginPage.resetPassword(qaUser.username, env.registrationCode, newPassword);
        qaUser.password = newPassword;
        await expect(loginPage.notification).toContainText('Password has been reset successfully');

        await loginPage.login(qaUser.username, newPassword);
        await app.expectSignedIn();
    });

    test('reset with a wrong registration code is refused', async ({loginPage, qaUser}) => {
        await loginPage.open();
        await loginPage.resetPassword(qaUser.username, 'wrong-code', 'whatever1', 403);
        await expect(loginPage.notification).toContainText('Invalid registration code');
    });
});

test.describe('Session', {tag: '@ui'}, () => {
    test('survives a page reload', async ({page, app}) => {
        await page.goto('/');
        await app.expectSignedIn();
        await page.reload();
        await app.expectSignedIn();
    });

    test('logout returns to the sign-in form', async ({page, app, loginPage}) => {
        await page.goto('/');
        await app.expectSignedIn();
        await app.logoutButton.click();
        await expect(loginPage.heading).toBeVisible();
        expect(await page.evaluate(() => window.localStorage.getItem('token'))).toBeNull();
    });
});
