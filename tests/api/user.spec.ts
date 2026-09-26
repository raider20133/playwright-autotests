import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {LoginResponse, Me, WishListEntry} from '@src/schemas';
import {env} from '@src/config/env';

test.describe('Profile and settings API', {tag: '@api'}, () => {
    test('"me" returns the profile of the token owner', {tag: '@smoke'}, async ({api, qaUser}) => {
        const me = expectContract(await api.user.me(), 200, Me);
        expect(me).toMatchObject({id: qaUser.id, username: qaUser.username});
        expect(me).not.toHaveProperty('password');
    });

    test('updates yearly leave allowances', async ({api}) => {
        const before = expectContract(await api.user.me(), 200, Me);
        try {
            expectMessage(await api.user.updateAllowances({vacation_days_per_year: 28, sick_days_per_year: 7}), 200, 'Settings updated successfully');
            expect(expectContract(await api.user.me(), 200, Me)).toMatchObject({vacation_days_per_year: 28, sick_days_per_year: 7});
        } finally {
            await api.user.updateAllowances({vacation_days_per_year: before.vacation_days_per_year, sick_days_per_year: before.sick_days_per_year});
        }
    });

    test('allowances need both values', async ({api}) => {
        expectMessage(await api.user.updateAllowances({vacation_days_per_year: 10}), 400, 'Both vacation and sick day counts are required');
    });

    test('saves the dashboard tab order', async ({api}) => {
        const before = expectContract(await api.user.me(), 200, Me);
        const reordered = [...before.tab_order].reverse();
        try {
            expectMessage(await api.user.updateTabOrder(reordered), 200, 'Tab order updated successfully');
            expect(expectContract(await api.user.me(), 200, Me).tab_order).toEqual(reordered);
        } finally {
            await api.user.updateTabOrder(before.tab_order);
        }
    });

    test('tab order must be an array', async ({api}) => {
        expectMessage(await api.user.updateTabOrder('tasks,events'), 400, 'tabOrder must be an array');
    });

    test.describe('change password', () => {
        test('rejects an invalid registration code', async ({api}) => {
            expectMessage(await api.user.changePassword({registrationCode: 'nope', newPassword: 'longenough'}), 403, 'Invalid registration code');
        });

        test('rejects a short password', async ({api}) => {
            expectMessage(await api.user.changePassword({registrationCode: env.registrationCode, newPassword: 'abc'}), 400,
                'New password must be at least 4 characters long');
        });

        test('the new password is used on the next login', async ({api, anonApi, qaUser}) => {
            const newPassword = `${qaUser.password}-changed`;
            expectStatus(await api.user.changePassword({registrationCode: env.registrationCode, newPassword}), 200);
            qaUser.password = newPassword;

            expectContract(await anonApi.auth.login({username: qaUser.username, password: newPassword}), 200, LoginResponse);
        });
    });

    test.describe('delete account', () => {
        test('requires the password as confirmation', async ({api}) => {
            expectMessage(await api.user.deleteAccount(), 400, 'Password is required to delete the account');
        });

        test('rejects a wrong password and keeps the account', async ({api}) => {
            expectMessage(await api.user.deleteAccount('wrong-password'), 401, 'Invalid password');
            expectStatus(await api.user.me(), 200);
        });

        test('deletes the account: login fails and the old token finds no user', async ({api, anonApi, qaUser}) => {
            expectStatus(await api.user.deleteAccount(qaUser.password), 204);

            expectMessage(await anonApi.auth.login({username: qaUser.username, password: qaUser.password}), 401, 'Invalid credentials');
            expectMessage(await api.user.me(), 404, 'User not found');
        });

        test('removes the user\'s data too, including lists shared with others', async ({api, peerApi, seed, qaUser, peerUser}) => {
            const list = await seed.wishlist();
            await seed.wishItem(list.id);
            expectStatus(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username}), 201);

            expectStatus(await api.user.deleteAccount(qaUser.password), 204);

            const peerLists = expectContract(await peerApi.wishlists.list(), 200, z.array(WishListEntry));
            expect(peerLists.map(l => l.id)).not.toContain(list.id);
            expectStatus(await peerApi.wishlists.items(list.id), 404);
        });
    });
});
