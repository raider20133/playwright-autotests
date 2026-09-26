import type {APIRequestContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {createApi} from '../api/clients';
import {expectContract, expectStatus} from '../api/assertions';
import {LoginResponse, Me} from '../schemas';
import {env} from '../config/env';

export interface QaUser {
    id: number;
    username: string;
    password: string;
    token: string;
}

/**
 * Self-provisioned test users: register the user, or — if it already exists — reset its
 * password with the registration code. The suite therefore needs no stored credentials,
 * and every run starts from a password only it knows.
 */
export async function ensureUser(http: APIRequestContext, username: string): Promise<QaUser> {
    const {auth} = createApi(http);
    const password = `qa-${randomBytes(9).toString('base64url')}`;
    const registrationCode = env.registrationCode;

    const registered = await auth.register({username, password, registrationCode});
    if (registered.status === 409) {
        expectStatus(await auth.resetPassword({username, registrationCode, newPassword: password}), 200);
    } else {
        expectStatus(registered, 201);
    }

    const {token} = expectContract(await auth.login({username, password}), 200, LoginResponse);
    const me = expectContract(await createApi(http, token).user.me(), 200, Me);
    return {id: me.id, username, password, token};
}

/**
 * One user per project and parallel slot, e.g. "qa_auto_chromium_1". Workers never share
 * data, so "delete all" and "close month" flows are safe to run in parallel.
 */
export function workerUsername(project: string, parallelIndex: number, role = 'owner'): string {
    return `qa_auto_${project}_${role}_${parallelIndex}`.toLowerCase();
}
