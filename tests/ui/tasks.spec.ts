import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract} from '@src/api/assertions';
import {build, uid} from '@src/data/builders';
import {monthStart} from '@src/data/dates';
import {Task} from '@src/schemas';

const symbols = {UAH: '₴', USD: '$', EUR: '€'} as const;

test.describe('Checklist', {tag: '@ui'}, () => {
    test('a free task is created and saved', {tag: '@smoke'}, async ({app, tasksPage, api}) => {
        await app.open('checklist');
        const name = `QA ui task ${uid()}`;
        const task = await tasksPage.addTask({name, type: 'Free'});

        await expect(tasksPage.item(task.id)).toContainText(name);
        await expect(tasksPage.item(task.id)).toContainText('free');
        // The UI said it worked — check the backend agrees
        const saved = expectContract(await api.tasks.list(monthStart()), 200, z.array(Task)).find(t => t.id === task.id);
        expect(saved).toMatchObject({name, type: 'free', is_done: false});
        await api.tasks.remove(task.id);
    });

    for (const currency of ['UAH', 'USD', 'EUR'] as const) {
        test(`a paid task shows its price in ${currency}`, async ({app, tasksPage, api}) => {
            await app.open('checklist');
            const task = await tasksPage.addTask({name: `QA ui paid ${uid()}`, type: 'Paid', price: '120', currency});

            await expect(tasksPage.item(task.id)).toContainText(`${symbols[currency]}120.00`);
            expect(task).toMatchObject({price: '120.00', currency});
            await api.tasks.remove(task.id);
        });
    }

    test('a task needs a name', async ({app, tasksPage, page}) => {
        await app.open('checklist');
        const posted: string[] = [];
        page.on('request', r => r.method() === 'POST' && posted.push(r.url()));

        await tasksPage.addButton.click();
        await tasksPage.form.getByTestId('task-form-add-button').click();

        await expect(tasksPage.form.getByRole('alert')).toHaveText('Task name is required.');
        expect(posted).toEqual([]);
    });

    test('completing a task strikes it through and saves the status', async ({app, tasksPage, seed, api}) => {
        const task = await seed.task();
        await app.open('checklist');

        await tasksPage.toggle(task.id);
        await expect(tasksPage.checkbox(task.id)).toBeChecked();
        await expect(tasksPage.label(task.id)).toHaveCSS('text-decoration-line', 'line-through');

        const saved = expectContract(await api.tasks.list(monthStart(), true), 200, z.array(Task));
        expect(saved.map(t => t.id)).toContain(task.id);
    });

    test('a deleted task disappears', async ({app, tasksPage, seed}) => {
        const task = await seed.task();
        await app.open('checklist');

        await tasksPage.remove(task.id);
        await expect(tasksPage.item(task.id)).toHaveCount(0);
    });

    test('month navigation shows each month\'s own tasks', async ({app, tasksPage, seed}) => {
        const current = await seed.task();
        const next = await seed.task(build.freeTask({month: monthStart(1)}));
        await app.open('checklist');

        await expect(tasksPage.item(current.id)).toBeVisible();
        await tasksPage.nextMonth();
        await expect(tasksPage.item(next.id)).toBeVisible();
        await expect(tasksPage.item(current.id)).toHaveCount(0);
        await tasksPage.previousMonth();
        await expect(tasksPage.item(current.id)).toBeVisible();
    });

    test.describe('close month', () => {
        test('carries every open task over to the next month', async ({app, tasksPage, seed, api}) => {
            const free = await seed.task();
            const paid = await seed.task(build.paidTask());
            await app.open('checklist');

            await tasksPage.openCloseMonth();
            await expect(tasksPage.closeMonthItem(free.id)).toBeVisible();
            await expect(tasksPage.closeMonthItem(paid.id)).toBeVisible();
            await tasksPage.confirmCloseMonth();

            await expect(tasksPage.emptyState).toHaveText('No tasks found for this month.');
            await tasksPage.nextMonth();
            await expect(tasksPage.item(free.id)).toBeVisible();
            await expect(tasksPage.item(paid.id)).toBeVisible();

            const nextMonth = expectContract(await api.tasks.list(monthStart(1)), 200, z.array(Task)).map(t => t.id);
            expect(nextMonth).toEqual(expect.arrayContaining([free.id, paid.id]));
        });

        test('a task unticked in the dialog stays in the current month', async ({app, tasksPage, seed, api}) => {
            const moved = await seed.task();
            const kept = await seed.task();
            await app.open('checklist');

            await tasksPage.openCloseMonth();
            await tasksPage.excludeFromCarryover(kept.id);
            await tasksPage.confirmCloseMonth();

            await expect(tasksPage.item(kept.id)).toBeVisible();
            await expect(tasksPage.item(moved.id)).toHaveCount(0);
            const current = expectContract(await api.tasks.list(monthStart()), 200, z.array(Task)).map(t => t.id);
            expect(current).toContain(kept.id);
            expect(current).not.toContain(moved.id);
        });
    });
});
