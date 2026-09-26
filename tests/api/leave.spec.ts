import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {build} from '@src/data/builders';
import {isoDay} from '@src/data/dates';
import {LeaveRequest} from '@src/schemas';

const Requests = z.array(LeaveRequest);

test.describe('Leave requests API', {tag: '@api'}, () => {
    test('a new request is pending and keeps its dates', {tag: '@smoke'}, async ({api, seed}) => {
        const input = build.leave({type: 'sick', start_date: isoDay(3), end_date: isoDay(5)});
        const id = await seed.leave(input);

        const request = expectContract(await api.leave.list(), 200, Requests).find(r => r.id === id);
        expect(request).toMatchObject({type: 'sick', status: 'pending'});
        expect(request?.start_date.slice(0, 10)).toBe(input.start_date);
        expect(request?.end_date.slice(0, 10)).toBe(input.end_date);
    });

    for (const field of ['type', 'start_date', 'end_date'] as const) {
        test(`rejects a request without ${field}`, async ({api}) => {
            expectMessage(await api.leave.create(build.leave({[field]: undefined})), 400, 'Type, start date, and end date are required');
        });
    }

    for (const status of ['approved', 'rejected'] as const) {
        test(`a pending request can be ${status}`, async ({api, seed}) => {
            const id = await seed.leave();
            expectMessage(await api.leave.setStatus(id, status), 200, `Request ${status} successfully.`);

            const request = expectContract(await api.leave.list(), 200, Requests).find(r => r.id === id);
            expect(request?.status).toBe(status);
        });
    }

    test('only "approved" and "rejected" are valid statuses', async ({api, seed}) => {
        const id = await seed.leave();
        expectMessage(await api.leave.setStatus(id, 'pending'), 400, 'Invalid status provided.');
        expectMessage(await api.leave.setStatus(id, 'cancelled'), 400, 'Invalid status provided.');
    });

    test('status change and delete of a missing request return 404', async ({api}) => {
        expectStatus(await api.leave.setStatus(2_000_000_000, 'approved'), 404);
        expectStatus(await api.leave.remove(2_000_000_000), 404);
    });

    test('delete returns 204 and removes the request', async ({api}) => {
        const {leaveId} = expectContract(await api.leave.create(build.leave()), 201, z.object({leaveId: z.number()}));
        expectStatus(await api.leave.remove(leaveId), 204);
        expect(expectContract(await api.leave.list(), 200, Requests).map(r => r.id)).not.toContain(leaveId);
    });

    test('"delete all" removes every request of the user', async ({api, seed}) => {
        await seed.leave();
        await seed.leave(build.leave({type: 'sick'}));

        expectMessage(await api.leave.removeAll(), 200, /^Successfully deleted \d+ leave requests\.$/);
        expect(expectContract(await api.leave.list(), 200, Requests)).toHaveLength(0);
    });

    test('yearly reset archives approved requests and leaves pending ones alone', async ({api, seed}) => {
        const approved = await seed.leave();
        const pending = await seed.leave();
        expectStatus(await api.leave.setStatus(approved, 'approved'), 200);

        expectMessage(await api.leave.archiveApproved(), 200, /^Successfully archived \d+ approved leave requests\.$/);
        const requests = expectContract(await api.leave.list(), 200, z.array(LeaveRequest.extend({is_archived: z.boolean()})));
        expect(requests.find(r => r.id === approved)?.is_archived).toBe(true);
        expect(requests.find(r => r.id === pending)?.is_archived).toBe(false);
    });

    test.describe('known bugs', () => {
        test('an end date before the start date should be rejected', async ({api}) => {
            test.fail(true, 'Known bug: date range is not validated, the request is created');
            const res = await api.leave.create(build.leave({start_date: isoDay(10), end_date: isoDay(2)}));
            expectStatus(res, 400);
        });

        test('an unknown leave type should be a 400, not a 500', async ({api}) => {
            test.fail(true, 'Known bug: type is not validated, the DB CHECK constraint fails with 500');
            expectStatus(await api.leave.create(build.leave({type: 'holiday'})), 400);
        });
    });
});
