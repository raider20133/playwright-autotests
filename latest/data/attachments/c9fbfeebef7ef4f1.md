# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/ui/tasks.spec.ts >> Checklist >> a paid task shows its price in UAH
- Location: tests/ui/tasks.spec.ts:24:9

# Error details

```
Error: GET https://managmenttool.onrender.com/api/tasks?month=2026-09-01 → 500

expect(received).toContain(expected) // indexOf

Expected value: 500
Received array: [200, 304]
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
          - button "Checklist" [active] [ref=e48] [cursor=pointer]
        - listitem [ref=e54]:
          - button "Wish List" [ref=e55] [cursor=pointer]
        - listitem [ref=e61]:
          - button "PDF Draw Tool" [ref=e62] [cursor=pointer]
        - listitem [ref=e68]:
          - button "Calendar" [ref=e69] [cursor=pointer]
  - main [ref=e75]:
    - generic [ref=e78]:
      - alert [ref=e79]:
        - generic [ref=e83]: Failed to fetch tasks.
      - generic [ref=e85]:
        - heading "Tasks" [level=6] [ref=e86]
        - generic [ref=e87]:
          - button [ref=e88] [cursor=pointer]
          - heading "September 2026" [level=5] [ref=e91]
          - button [ref=e92] [cursor=pointer]
        - separator [ref=e95]
        - heading "Tasks for September" [level=5] [ref=e96]
        - generic [ref=e97]:
          - paragraph [ref=e98]: No tasks found for this month.
          - separator [ref=e99]
          - generic [ref=e100]:
            - button "Add Task" [ref=e101] [cursor=pointer]
            - button "Close Month" [disabled]
```

# Test source

```ts
  1  | import {expect, type Locator, type Page, type Response} from '@playwright/test';
  2  | import type {HttpMethod} from '../api/http';
  3  | 
  4  | export abstract class BasePage {
  5  |     constructor(protected readonly page: Page) {}
  6  | 
  7  |     /** The snackbar alert used by the app for success and error notifications. */
  8  |     get notification(): Locator {
  9  |         return this.page.getByRole('alert');
  10 |     }
  11 | 
  12 |     /**
  13 |      * Runs a UI action and waits for the API call it must trigger. The listener is attached
  14 |      * before the action, so a fast response can never be missed.
  15 |      */
  16 |     protected async expectRequest(
  17 |         method: HttpMethod,
  18 |         path: string | RegExp,
  19 |         status: number,
  20 |         action: () => Promise<unknown>,
  21 |     ): Promise<Response> {
  22 |         const matches = (url: string) => (typeof path === 'string' ? new URL(url).pathname === path : path.test(new URL(url).pathname));
  23 |         const [response] = await Promise.all([
  24 |             this.page.waitForResponse(res => res.request().method() === method && matches(res.url())),
  25 |             action(),
  26 |         ]);
  27 |         // Firefox and WebKit revalidate repeated GETs with the ETag, so the same data can come back as 304
  28 |         const accepted = method === 'GET' && status === 200 ? [200, 304] : [status];
> 29 |         expect(accepted, `${method} ${response.url()} → ${response.status()}`).toContain(response.status());
     |                                                                                ^ Error: GET https://managmenttool.onrender.com/api/tasks?month=2026-09-01 → 500
  30 |         return response;
  31 |     }
  32 | 
  33 |     /** MUI Select: open the listbox and pick an option by its visible label. */
  34 |     protected async choose(select: Locator, option: string): Promise<void> {
  35 |         await select.getByRole('combobox').click();
  36 |         await this.page.getByRole('option', {name: option, exact: true}).click();
  37 |     }
  38 | }
  39 | 
```