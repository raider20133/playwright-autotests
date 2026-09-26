import {expect} from '@playwright/test';
import {z} from 'zod';
import type {ApiResponse} from './http';

const describe = (res: ApiResponse) => `${res.method} ${res.url} → ${res.status} ${JSON.stringify(res.body)}`;

export function expectStatus(res: ApiResponse, status: number): void {
    expect(res.status, describe(res)).toBe(status);
}

/** Asserts the status and validates the body against its contract; returns the typed body. */
export function expectContract<S extends z.ZodType>(res: ApiResponse, status: number, schema: S): z.infer<S> {
    expectStatus(res, status);
    const result = schema.safeParse(res.body);
    if (!result.success) {
        throw new Error(`Contract mismatch for ${res.method} ${res.url}:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
}

export function expectMessage(res: ApiResponse, status: number, message: string | RegExp): void {
    const body = expectContract(res, status, z.object({message: z.string()}));
    if (typeof message === 'string') expect(body.message).toBe(message);
    else expect(body.message).toMatch(message);
}

/**
 * For known-bug tests that expect a rejection: if the API accepts the input after all,
 * delete what it created so the check never leaks data.
 */
export async function discardIfCreated<T>(res: ApiResponse, remove: (body: T) => Promise<unknown>): Promise<void> {
    if (res.status === 201) await remove(res.body as T);
}
