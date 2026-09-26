import {test as base, expect, type APIRequestContext} from '@playwright/test';
import {createApi, type Api} from '../api/clients';
import {env} from '../config/env';
import {purgeUserData} from '../data/purge';
import {ensureUser, workerUsername, type QaUser} from '../users/qa-users';
import {AppShell} from '../pages/app-shell';
import {LoginPage} from '../pages/login.page';
import {TasksPage} from '../pages/tasks.page';
import {LeavePage} from '../pages/leave.page';
import {WishlistPage} from '../pages/wishlist.page';
import {Cleanup} from './cleanup';
import {createSeed, type Seed} from './seed';

type WorkerFixtures = {
    apiContext: APIRequestContext;
    /** This worker's own user; its data is purged when the worker starts. */
    qaUser: QaUser;
    /** A second user, for sharing and cross-user access tests. Created only when a test asks for it. */
    peerUser: QaUser;
};

type TestFixtures = {
    /** Start UI tests already signed in as qaUser (token injected into localStorage). */
    authenticated: boolean;
    api: Api;
    peerApi: Api;
    anonApi: Api;
    seed: Seed;
    peerSeed: Seed;
    app: AppShell;
    loginPage: LoginPage;
    tasksPage: TasksPage;
    leavePage: LeavePage;
    wishlistPage: WishlistPage;
};

const provision = async (http: APIRequestContext, username: string) => {
    const user = await ensureUser(http, username);
    await purgeUserData(createApi(http, user.token));
    return user;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
    apiContext: [async ({playwright}, use) => {
        const context = await playwright.request.newContext({baseURL: env.apiUrl, timeout: 30_000});
        await use(context);
        await context.dispose();
    }, {scope: 'worker'}],

    qaUser: [async ({apiContext}, use, workerInfo) => {
        await use(await provision(apiContext, workerUsername(workerInfo.project.name, workerInfo.parallelIndex)));
    }, {scope: 'worker'}],

    peerUser: [async ({apiContext}, use, workerInfo) => {
        await use(await provision(apiContext, workerUsername(workerInfo.project.name, workerInfo.parallelIndex, 'peer')));
    }, {scope: 'worker'}],

    authenticated: [true, {option: true}],

    api: async ({apiContext, qaUser}, use) => use(createApi(apiContext, qaUser.token)),
    peerApi: async ({apiContext, peerUser}, use) => use(createApi(apiContext, peerUser.token)),
    anonApi: async ({apiContext}, use) => use(createApi(apiContext)),

    seed: async ({api}, use, testInfo) => {
        const cleanup = new Cleanup();
        await use(createSeed(api, cleanup));
        await cleanup.run(testInfo);
    },

    peerSeed: async ({peerApi}, use, testInfo) => {
        const cleanup = new Cleanup();
        await use(createSeed(peerApi, cleanup));
        await cleanup.run(testInfo);
    },

    context: async ({context, authenticated, qaUser}, use) => {
        if (authenticated) {
            await context.addInitScript(token => window.localStorage.setItem('token', token), qaUser.token);
        }
        await use(context);
    },

    app: async ({page}, use) => use(new AppShell(page)),
    loginPage: async ({page}, use) => use(new LoginPage(page)),
    tasksPage: async ({page}, use) => use(new TasksPage(page)),
    leavePage: async ({page}, use) => use(new LeavePage(page)),
    wishlistPage: async ({page}, use) => use(new WishlistPage(page)),
});

export {expect};
