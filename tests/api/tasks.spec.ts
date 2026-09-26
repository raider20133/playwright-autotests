import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {build} from '@src/data/builders';
import {monthStart} from '@src/data/dates';
import {Task} from '@src/schemas';

const Tasks = z.array(Task);

test.describe('Tasks API', {tag: '@api'}, () => {
    test('creates a free task with no price or currency', {tag: '@smoke'}, async ({seed}) => {
        const input = build.freeTask();
        const task = await seed.task(input);

        expect(task).toMatchObject({name: input.name, type: 'free', price: null, currency: null, is_done: false});
        expect(task.month.slice(0, 7)).toBe(monthStart().slice(0, 7));
    });

    for (const currency of ['UAH', 'USD', 'EUR'] as const) {
        test(`creates a paid task in ${currency}, keeping the price to the cent`, async ({seed}) => {
            const task = await seed.task(build.paidTask({price: 99.5, currency}));
            expect(task).toMatchObject({type: 'paid', price: '99.50', currency});
        });
    }

    const invalid: Array<[string, Record<string, unknown>, string]> = [
        ['name is missing', {name: undefined}, 'Name, type, and month are required'],
        ['type is missing', {type: undefined}, 'Name, type, and month are required'],
        ['month is missing', {month: undefined}, 'Name, type, and month are required'],
        ['a paid task has no price', {type: 'paid', price: undefined, currency: 'UAH'}, 'A valid price is required for paid tasks'],
        ['a paid task has a non-numeric price', {type: 'paid', price: 'abc', currency: 'UAH'}, 'A valid price is required for paid tasks'],
        ['a paid task has no currency', {type: 'paid', price: 10, currency: undefined}, 'Currency is required for paid tasks'],
    ];
    for (const [title, overrides, message] of invalid) {
        test(`rejects creation when ${title}`, async ({api}) => {
            expectMessage(await api.tasks.create({...build.freeTask(), ...overrides}), 400, message);
        });
    }

    test.describe('known bugs: database constraints leak as 500', () => {
        const cases: Array<[string, Record<string, unknown>]> = [
            ['a negative price', {type: 'paid', price: -5, currency: 'UAH'}],
            ['an unsupported currency', {type: 'paid', price: 5, currency: 'GBP'}],
            ['an unknown task type', {type: 'urgent'}],
        ];
        for (const [title, overrides] of cases) {
            test(`${title} should be a 400, not a 500`, async ({api}) => {
                test.fail(true, 'Known bug: input is not validated, the DB CHECK constraint fails with 500');
                const res = await api.tasks.create({...build.freeTask(), ...overrides});
                expectStatus(res, 400);
            });
        }
    });

    test('lists only the requested month', async ({api, seed}) => {
        const current = await seed.task(build.freeTask());
        const next = await seed.task(build.freeTask({month: monthStart(1)}));

        const ids = expectContract(await api.tasks.list(monthStart()), 200, Tasks).map(t => t.id);
        expect(ids).toContain(current.id);
        expect(ids).not.toContain(next.id);
    });

    test('filters by completion status', async ({api, seed}) => {
        const open = await seed.task();
        const done = await seed.task();
        expectStatus(await api.tasks.update(done.id, {...done, is_done: true}), 200);

        const doneIds = expectContract(await api.tasks.list(monthStart(), true), 200, Tasks).map(t => t.id);
        expect(doneIds).toContain(done.id);
        expect(doneIds).not.toContain(open.id);
    });

    test('requires the month query parameter', async ({api}) => {
        expectMessage(await api.tasks.list(), 400, 'Month is required');
    });

    test('"today" returns the current month tasks', async ({api, seed}) => {
        const task = await seed.task();
        const today = expectContract(await api.tasks.today(), 200, z.array(Task.loose()));
        expect(today.map(t => t.id)).toContain(task.id);
    });

    test('marks a task as done', async ({api, seed}) => {
        const task = await seed.task();
        const updated = expectContract(await api.tasks.update(task.id, {...task, is_done: true}), 200, Task);
        expect(updated.is_done).toBe(true);
    });

    test('switching a task to paid requires a currency', async ({api, seed}) => {
        const task = await seed.task();
        expectMessage(await api.tasks.update(task.id, {name: task.name, type: 'paid', price: 10}), 400, 'Currency is required for paid tasks');
    });

    test('update and delete of a missing task return 404', async ({api}) => {
        expectStatus(await api.tasks.update(2_000_000_000, {name: 'x', type: 'free', is_done: false}), 404);
        expectStatus(await api.tasks.remove(2_000_000_000), 404);
    });

    test('delete returns 204, then the task is gone', async ({api}) => {
        const task = expectContract(await api.tasks.create(build.freeTask()), 201, Task);
        expectStatus(await api.tasks.remove(task.id), 204);
        expectStatus(await api.tasks.remove(task.id), 404);
    });

    test.describe('carryover', () => {
        test('moves tasks to the target month with the given statuses', async ({api, seed}) => {
            const a = await seed.task();
            const b = await seed.task(build.paidTask());

            const moved = expectContract(await api.tasks.carryover({
                fromMonth: monthStart(), toMonth: monthStart(1), taskIds: [a.id, b.id], statuses: [true, false],
            }), 201, Tasks);

            expect(moved.map(t => [t.id, t.is_done])).toEqual(expect.arrayContaining([[a.id, true], [b.id, false]]));
            const nextIds = expectContract(await api.tasks.list(monthStart(1)), 200, Tasks).map(t => t.id);
            expect(nextIds).toEqual(expect.arrayContaining([a.id, b.id]));
        });

        test('validates required fields', async ({api}) => {
            expectMessage(await api.tasks.carryover({fromMonth: monthStart()}), 400, 'fromMonth, toMonth, taskIds, and statuses are required');
        });
    });
});
