import type {APIRequestContext} from '@playwright/test';
import {randomBytes} from 'node:crypto';
import {createApi} from '../api/clients';
import {expectContract, expectStatus} from '../api/assertions';
import {LoginResponse, Me} from '../schemas';
import {uid} from '../data/builders';
import {env} from '../config/env';

export interface QaUser {
    id: number;
    username: string;
    password: string;
    token: string;
}

/** Registers a brand-new user for one test. Nothing is shared between tests. */
export async function createUser(http: APIRequestContext): Promise<QaUser> {
    const {auth} = createApi(http);
    const username = `qa_auto_${uid()}`;
    const password = `qa-${randomBytes(9).toString('base64url')}`;

    expectStatus(await auth.register({username, password, registrationCode: env.registrationCode}), 201);
    const {token} = expectContract(await auth.login({username, password}), 200, LoginResponse);
    const me = expectContract(await createApi(http, token).user.me(), 200, Me);
    return {id: me.id, username, password, token};
}

/** Deletes the user; ON DELETE CASCADE removes everything the test created. */
export async function deleteUser(http: APIRequestContext, user: QaUser): Promise<void> {
    const res = await createApi(http, user.token).user.deleteAccount(user.password);
    // 404: the test itself already deleted the account
    if (res.status !== 404) expectStatus(res, 204);
}
