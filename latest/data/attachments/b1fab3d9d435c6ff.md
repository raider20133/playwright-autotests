# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/api/leave.spec.ts >> Leave requests API >> known bugs >> an end date before the start date should be rejected
- Location: tests/api/leave.spec.ts:74:9

# Error details

```
Error: POST https://managmenttool.onrender.com/api/leave → 201 {"message":"Leave request created successfully","leaveId":4623}

expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 201
```

# Test source

```ts
  1  | import {expect} from '@playwright/test';
  2  | import {z} from 'zod';
  3  | import type {ApiResponse} from './http';
  4  | 
  5  | const describe = (res: ApiResponse) => `${res.method} ${res.url} → ${res.status} ${JSON.stringify(res.body)}`;
  6  | 
  7  | export function expectStatus(res: ApiResponse, status: number): void {
> 8  |     expect(res.status, describe(res)).toBe(status);
     |                                       ^ Error: POST https://managmenttool.onrender.com/api/leave → 201 {"message":"Leave request created successfully","leaveId":4623}
  9  | }
  10 | 
  11 | /** Asserts the status and validates the body against its contract; returns the typed body. */
  12 | export function expectContract<S extends z.ZodType>(res: ApiResponse, status: number, schema: S): z.infer<S> {
  13 |     expectStatus(res, status);
  14 |     const result = schema.safeParse(res.body);
  15 |     if (!result.success) {
  16 |         throw new Error(`Contract mismatch for ${res.method} ${res.url}:\n${z.prettifyError(result.error)}`);
  17 |     }
  18 |     return result.data;
  19 | }
  20 | 
  21 | export function expectMessage(res: ApiResponse, status: number, message: string | RegExp): void {
  22 |     const body = expectContract(res, status, z.object({message: z.string()}));
  23 |     if (typeof message === 'string') expect(body.message).toBe(message);
  24 |     else expect(body.message).toMatch(message);
  25 | }
  26 | 
  27 | 
```