# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/ui/tasks.spec.ts >> Checklist >> close month >> carries every open task over to the next month
- Location: tests/ui/tasks.spec.ts:79:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: ArrayContaining [6663, 6664]
Received: []
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - paragraph [ref=e7]: Pages / Checklist
        - heading "Checklist" [level=6] [ref=e8]
      - generic [ref=e9]:
        - button [ref=e10] [cursor=pointer]
        - button [ref=e13] [cursor=pointer]
        - button [ref=e16] [cursor=pointer]
  - navigation "mailbox folders" [ref=e19]:
    - generic [ref=e21]:
      - generic [ref=e22]: Chronos
      - list [ref=e24]:
        - listitem [ref=e25]:
          - button "Dashboard" [ref=e26] [cursor=pointer]
        - listitem [ref=e32]:
          - button "Leave Requests" [ref=e33] [cursor=pointer]
        - listitem [ref=e39]:
          - button "Service Tracker" [ref=e40] [cursor=pointer]
        - listitem [ref=e47]:
          - button "Checklist" [ref=e48] [cursor=pointer]
        - listitem [ref=e54]:
          - button "Wish List" [ref=e55] [cursor=pointer]
        - listitem [ref=e61]:
          - button "Книги" [ref=e62] [cursor=pointer]
        - listitem [ref=e69]:
          - button "PDF Draw Tool" [ref=e70] [cursor=pointer]
        - listitem [ref=e76]:
          - button "Calendar" [ref=e77] [cursor=pointer]
  - main [ref=e83]:
    - generic [ref=e88]:
      - heading "Tasks" [level=6] [ref=e89]
      - generic [ref=e90]:
        - button [ref=e91] [cursor=pointer]
        - heading "December 2026" [level=5] [ref=e94]
        - button [active] [ref=e95] [cursor=pointer]
      - separator [ref=e98]
      - heading "Tasks for December" [level=5] [ref=e99]
      - generic [ref=e100]:
        - list [ref=e101]:
          - listitem [ref=e102]:
            - checkbox [ref=e104] [cursor=pointer]
            - generic [ref=e107]:
              - generic [ref=e108]: QA paid task mvw0xzvv28712
              - paragraph [ref=e109]: ₴120.00
            - button "delete" [ref=e111] [cursor=pointer]
          - listitem [ref=e114]:
            - checkbox [ref=e116] [cursor=pointer]
            - generic [ref=e119]:
              - generic [ref=e120]: QA free task mvw0xzoi28711
              - paragraph [ref=e121]: free
            - button "delete" [ref=e123] [cursor=pointer]
        - separator [ref=e126]
        - generic [ref=e127]:
          - button "Add Task" [ref=e128] [cursor=pointer]
          - button "Close Month" [ref=e129] [cursor=pointer]
```

# Test source

```ts
  1   | import {z} from 'zod';
  2   | import {test, expect} from '@src/fixtures';
  3   | import {expectContract} from '@src/api/assertions';
  4   | import {build, uid} from '@src/data/builders';
  5   | import {monthStart} from '@src/data/dates';
  6   | import {Task} from '@src/schemas';
  7   | 
  8   | const symbols = {UAH: '₴', USD: '$', EUR: '€'} as const;
  9   | 
  10  | test.describe('Checklist', {tag: '@ui'}, () => {
  11  |     test('a free task is created and saved', {tag: '@smoke'}, async ({app, tasksPage, api}) => {
  12  |         await app.open('checklist');
  13  |         const name = `QA ui task ${uid()}`;
  14  |         const task = await tasksPage.addTask({name, type: 'Free'});
  15  | 
  16  |         await expect(tasksPage.item(task.id)).toContainText(name);
  17  |         await expect(tasksPage.item(task.id)).toContainText('free');
  18  |         // The UI said it worked — check the backend agrees
  19  |         const saved = expectContract(await api.tasks.list(monthStart()), 200, z.array(Task)).find(t => t.id === task.id);
  20  |         expect(saved).toMatchObject({name, type: 'free', is_done: false});
  21  |     });
  22  | 
  23  |     for (const currency of ['UAH', 'USD', 'EUR'] as const) {
  24  |         test(`a paid task shows its price in ${currency}`, async ({app, tasksPage}) => {
  25  |             await app.open('checklist');
  26  |             const task = await tasksPage.addTask({name: `QA ui paid ${uid()}`, type: 'Paid', price: '120', currency});
  27  | 
  28  |             await expect(tasksPage.item(task.id)).toContainText(`${symbols[currency]}120.00`);
  29  |             expect(task).toMatchObject({price: '120.00', currency});
  30  |         });
  31  |     }
  32  | 
  33  |     test('a task needs a name', async ({app, tasksPage, page}) => {
  34  |         await app.open('checklist');
  35  |         const posted: string[] = [];
  36  |         page.on('request', r => r.method() === 'POST' && posted.push(r.url()));
  37  | 
  38  |         await tasksPage.addButton.click();
  39  |         await tasksPage.form.getByTestId('task-form-add-button').click();
  40  | 
  41  |         await expect(tasksPage.form.getByRole('alert')).toHaveText('Task name is required.');
  42  |         expect(posted).toEqual([]);
  43  |     });
  44  | 
  45  |     test('completing a task strikes it through and saves the status', async ({app, tasksPage, seed, api}) => {
  46  |         const task = await seed.task();
  47  |         await app.open('checklist');
  48  | 
  49  |         await tasksPage.toggle(task.id);
  50  |         await expect(tasksPage.checkbox(task.id)).toBeChecked();
  51  |         await expect(tasksPage.label(task.id)).toHaveCSS('text-decoration-line', 'line-through');
  52  | 
  53  |         const saved = expectContract(await api.tasks.list(monthStart(), true), 200, z.array(Task));
  54  |         expect(saved.map(t => t.id)).toContain(task.id);
  55  |     });
  56  | 
  57  |     test('a deleted task disappears', async ({app, tasksPage, seed}) => {
  58  |         const task = await seed.task();
  59  |         await app.open('checklist');
  60  | 
  61  |         await tasksPage.remove(task.id);
  62  |         await expect(tasksPage.item(task.id)).toHaveCount(0);
  63  |     });
  64  | 
  65  |     test('month navigation shows each month\'s own tasks', async ({app, tasksPage, seed}) => {
  66  |         const current = await seed.task();
  67  |         const next = await seed.task(build.freeTask({month: monthStart(1)}));
  68  |         await app.open('checklist');
  69  | 
  70  |         await expect(tasksPage.item(current.id)).toBeVisible();
  71  |         await tasksPage.nextMonth();
  72  |         await expect(tasksPage.item(next.id)).toBeVisible();
  73  |         await expect(tasksPage.item(current.id)).toHaveCount(0);
  74  |         await tasksPage.previousMonth();
  75  |         await expect(tasksPage.item(current.id)).toBeVisible();
  76  |     });
  77  | 
  78  |     test.describe('close month', () => {
  79  |         test('carries every open task over to the next month', async ({app, tasksPage, seed, api}) => {
  80  |             const free = await seed.task();
  81  |             const paid = await seed.task(build.paidTask());
  82  |             await app.open('checklist');
  83  | 
  84  |             await tasksPage.openCloseMonth();
  85  |             await expect(tasksPage.closeMonthItem(free.id)).toBeVisible();
  86  |             await expect(tasksPage.closeMonthItem(paid.id)).toBeVisible();
  87  |             await tasksPage.confirmCloseMonth();
  88  | 
  89  |             await expect(tasksPage.emptyState).toHaveText('No tasks found for this month.');
  90  |             await tasksPage.nextMonth();
  91  |             await expect(tasksPage.item(free.id)).toBeVisible();
  92  |             await expect(tasksPage.item(paid.id)).toBeVisible();
  93  | 
  94  |             const nextMonth = expectContract(await api.tasks.list(monthStart(1)), 200, z.array(Task)).map(t => t.id);
> 95  |             expect(nextMonth).toEqual(expect.arrayContaining([free.id, paid.id]));
      |                               ^ Error: expect(received).toEqual(expected) // deep equality
  96  |         });
  97  | 
  98  |         test('a task unticked in the dialog stays in the current month', async ({app, tasksPage, seed, api}) => {
  99  |             const moved = await seed.task();
  100 |             const kept = await seed.task();
  101 |             await app.open('checklist');
  102 | 
  103 |             await tasksPage.openCloseMonth();
  104 |             await tasksPage.excludeFromCarryover(kept.id);
  105 |             await tasksPage.confirmCloseMonth();
  106 | 
  107 |             await expect(tasksPage.item(kept.id)).toBeVisible();
  108 |             await expect(tasksPage.item(moved.id)).toHaveCount(0);
  109 |             const current = expectContract(await api.tasks.list(monthStart()), 200, z.array(Task)).map(t => t.id);
  110 |             expect(current).toContain(kept.id);
  111 |             expect(current).not.toContain(moved.id);
  112 |         });
  113 |     });
  114 | });
  115 | 
```