import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {LoginResponse, Me} from '@src/schemas';
import {env} from '@src/config/env';

test.describe('Auth API', {tag: '@api'}, () => {
    test('login returns a JWT that opens protected endpoints', {tag: '@smoke'}, async ({anonApi, qaUser}) => {
        const {token} = expectContract(await anonApi.auth.login({username: qaUser.username, password: qaUser.password}), 200, LoginResponse);

        const me = expectContract(await anonApi.user.me({token}), 200, Me);
        expect(me).toMatchObject({id: qaUser.id, username: qaUser.username});
    });

    test('wrong password and unknown user get the same 401, so usernames cannot be enumerated', async ({anonApi, qaUser}) => {
        const wrongPassword = await anonApi.auth.login({username: qaUser.username, password: 'definitely-wrong'});
        const unknownUser = await anonApi.auth.login({username: `nobody_${Date.now()}`, password: 'whatever'});

        expectMessage(wrongPassword, 401, 'Invalid credentials');
        expectMessage(unknownUser, 401, 'Invalid credentials');
    });

    for (const [field, body] of [
        ['username', {password: 'secret'}],
        ['password', {username: 'someone'}],
    ] as const) {
        test(`login without ${field} is rejected with 400`, async ({anonApi}) => {
            expectMessage(await anonApi.auth.login(body), 400, 'Username and password are required');
        });
    }

    test('registration requires a valid registration code', async ({anonApi}) => {
        const res = await anonApi.auth.register({username: `qa_never_${Date.now()}`, password: 'secret1', registrationCode: 'wrong-code'});
        expectMessage(res, 403, 'Invalid registration code');
    });

    test('registration validates required fields', async ({anonApi}) => {
        const res = await anonApi.auth.register({username: '', password: '', registrationCode: env.registrationCode});
        expectMessage(res, 400, 'Username and password are required');
    });

    test('registering an existing username is rejected with 409', async ({anonApi, qaUser}) => {
        const res = await anonApi.auth.register({username: qaUser.username, password: 'another1', registrationCode: env.registrationCode});
        expectMessage(res, 409, 'Username already taken');
    });

    test.describe('password reset', () => {
        test('rejects an invalid registration code', async ({anonApi, qaUser}) => {
            const res = await anonApi.auth.resetPassword({username: qaUser.username, registrationCode: 'nope', newPassword: 'newpass1'});
            expectMessage(res, 403, 'Invalid registration code');
        });

        test('rejects a password shorter than 4 characters', async ({anonApi, qaUser}) => {
            const res = await anonApi.auth.resetPassword({username: qaUser.username, registrationCode: env.registrationCode, newPassword: 'abc'});
            expectMessage(res, 400, 'New password must be at least 4 characters long');
        });

        test('returns 404 for an unknown user', async ({anonApi}) => {
            const res = await anonApi.auth.resetPassword({username: `nobody_${Date.now()}`, registrationCode: env.registrationCode, newPassword: 'newpass1'});
            expectMessage(res, 404, 'User not found');
        });

        test('new password works and the old one stops working', async ({anonApi, qaUser}) => {
            const oldPassword = qaUser.password;
            const newPassword = `${oldPassword}-rotated`;

            expectStatus(await anonApi.auth.resetPassword({username: qaUser.username, registrationCode: env.registrationCode, newPassword}), 200);
            qaUser.password = newPassword;

            expectStatus(await anonApi.auth.login({username: qaUser.username, password: oldPassword}), 401);
            expectContract(await anonApi.auth.login({username: qaUser.username, password: newPassword}), 200, LoginResponse);
        });
    });
});
