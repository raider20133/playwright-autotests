import {test as base, expect, type APIRequestContext} from '@playwright/test';
import {createApi, type Api} from '../api/clients';
import {env} from '../config/env';
import {createUser, deleteUser, type QaUser} from '../users/qa-users';
import {AppShell} from '../pages/app-shell';
import {LoginPage} from '../pages/login.page';
import {TasksPage} from '../pages/tasks.page';
import {LeavePage} from '../pages/leave.page';
import {WishlistPage} from '../pages/wishlist.page';
import {createSeed, type Seed} from './seed';

type WorkerFixtures = {
    apiContext: APIRequestContext;
};

type TestFixtures = {
    /** A fresh user created for this test only and deleted, with all its data, afterwards. */
    qaUser: QaUser;
    /** A second throwaway user, for sharing and cross-user access tests. Created only when asked for. */
    peerUser: QaUser;
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

export const test = base.extend<TestFixtures, WorkerFixtures>({
    apiContext: [async ({playwright}, use) => {
        const context = await playwright.request.newContext({baseURL: env.apiUrl, timeout: 30_000});
        await use(context);
        await context.dispose();
    }, {scope: 'worker'}],

    qaUser: async ({apiContext}, use) => {
        const user = await createUser(apiContext);
        await use(user);
        await deleteUser(apiContext, user);
    },

    peerUser: async ({apiContext}, use) => {
        const user = await createUser(apiContext);
        await use(user);
        await deleteUser(apiContext, user);
    },

    authenticated: [true, {option: true}],

    api: async ({apiContext, qaUser}, use) => use(createApi(apiContext, qaUser.token)),
    peerApi: async ({apiContext, peerUser}, use) => use(createApi(apiContext, peerUser.token)),
    anonApi: async ({apiContext}, use) => use(createApi(apiContext)),

    seed: async ({api}, use) => use(createSeed(api)),
    peerSeed: async ({peerApi}, use) => use(createSeed(peerApi)),

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
