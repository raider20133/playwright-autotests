import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {LoginResponse, Me} from '@src/schemas';
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
});
