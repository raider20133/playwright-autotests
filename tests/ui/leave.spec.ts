import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract} from '@src/api/assertions';
import {build} from '@src/data/builders';
import {isoDay, uiDate} from '@src/data/dates';
import {LeaveRequest} from '@src/schemas';

test.describe('Leave requests', {tag: '@ui'}, () => {
    for (const [label, type] of [['Vacation', 'vacation'], ['Sick Leave', 'sick']] as const) {
        test(`a ${type} request is submitted as pending`, type === 'vacation' ? {tag: '@smoke'} : {}, async ({app, leavePage, api}) => {
            await app.open('leave');
            const start = isoDay(20);
            const end = isoDay(24);
            const id = await leavePage.request(label, start, end);

            await expect(leavePage.type(id)).toHaveText(type);
            await expect(leavePage.status(id)).toHaveText('pending');
            await expect(leavePage.dates(id)).toHaveText(`${uiDate(`${start}T00:00:00Z`)} - ${uiDate(`${end}T00:00:00Z`)}`);

            const saved = expectContract(await api.leave.list(), 200, z.array(LeaveRequest)).find(r => r.id === id);
            expect(saved).toMatchObject({type, status: 'pending'});
        });
    }

    test('dates are required', async ({app, leavePage}) => {
        await app.open('leave');
        await leavePage.submit.click();
        await expect(leavePage.formError).toBeVisible();
    });

    test('approving a request updates its status and hides the actions', async ({app, leavePage, seed}) => {
        const id = await seed.leave();
        await app.open('leave');

        await leavePage.approve(id);
        await expect(leavePage.status(id)).toHaveText('approved');
        await expect(leavePage.approveButton(id)).toBeHidden();
        await expect(leavePage.rejectButton(id)).toBeHidden();
    });

    test('rejecting a request updates its status', async ({app, leavePage, seed}) => {
        const id = await seed.leave(build.leave({type: 'sick'}));
        await app.open('leave');

        await leavePage.reject(id);
        await expect(leavePage.status(id)).toHaveText('rejected');
    });

    test('a deleted request disappears', async ({app, leavePage, seed}) => {
        const id = await seed.leave();
        await app.open('leave');

        await leavePage.remove(id);
        await expect(leavePage.card(id)).toHaveCount(0);
    });

    test('"Delete All" clears the list after confirmation', async ({app, leavePage, seed}) => {
        await seed.leave();
        await seed.leave(build.leave({type: 'sick'}));
        await app.open('leave');

        await leavePage.removeAll();
        await expect(leavePage.emptyState).toBeVisible();
    });
});
