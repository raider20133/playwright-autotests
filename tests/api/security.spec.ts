import type {APIRequestContext} from '@playwright/test';
import {test, expect} from '@src/fixtures';
import {expectStatus} from '@src/api/assertions';
import {BaseApi, type HttpMethod} from '@src/api/http';
import {build} from '@src/data/builders';
import {forgedToken, unsignedToken} from '@src/data/tokens';

/** Raw access to any route with any token, for the auth matrix. */
class RawApi extends BaseApi {
    constructor(http: APIRequestContext) {
        super(http);
    }

    call(method: HttpMethod, path: string, token: string | null) {
        return this.send(method, path, {token, data: method === 'GET' ? undefined : {}});
    }
}

const protectedRoutes: Array<[HttpMethod, string]> = [
    ['GET', '/api/me'],
    ['PUT', '/api/users/me/tab-order'],
    ['PUT', '/api/settings'],
    ['PUT', '/api/user/password'],
    ['DELETE', '/api/users/me'],
    ['GET', '/api/leave'],
    ['POST', '/api/leave'],
    ['PUT', '/api/leave/1/status'],
    ['POST', '/api/leave/reset'],
    ['DELETE', '/api/leave/all'],
    ['DELETE', '/api/leave/1'],
    ['GET', '/api/services'],
    ['POST', '/api/services'],
    ['PUT', '/api/services/1'],
    ['DELETE', '/api/services/1'],
    ['POST', '/api/events'],
    ['PUT', '/api/events/1'],
    ['DELETE', '/api/events/1'],
    ['GET', '/api/tasks?month=2026-01-01'],
    ['GET', '/api/tasks/today'],
    ['POST', '/api/tasks'],
    ['PUT', '/api/tasks/1'],
    ['DELETE', '/api/tasks/1'],
    ['POST', '/api/tasks/carryover'],
    ['GET', '/api/wishlists'],
    ['POST', '/api/wishlists'],
    ['PUT', '/api/wishlists/1'],
    ['DELETE', '/api/wishlists/1'],
    ['POST', '/api/wishlists/1/share'],
    ['GET', '/api/wishlists/1/share'],
    ['DELETE', '/api/wishlists/1/share/1'],
    ['GET', '/api/wishlists/1/items'],
    ['POST', '/api/wishlists/1/items'],
    ['PUT', '/api/wishlists/items/1'],
    ['DELETE', '/api/wishlists/items/1'],
];

test.describe('API security', {tag: ['@api', '@security']}, () => {
    test.describe('authentication is enforced on every protected route', () => {
        for (const [method, path] of protectedRoutes) {
            test(`${method} ${path}`, async ({apiContext, qaUser}) => {
                const raw = new RawApi(apiContext);
                const claims = {userId: qaUser.id, username: qaUser.username};

                expectStatus(await raw.call(method, path, null), 401);
                expectStatus(await raw.call(method, path, 'not-a-jwt'), 403);
                expectStatus(await raw.call(method, path, forgedToken(claims)), 403);
                expectStatus(await raw.call(method, path, unsignedToken(claims)), 403);
            });
        }
    });

    test.describe('users cannot touch each other\'s data', () => {
        test('tasks', async ({seed, peerApi}) => {
            const task = await seed.task();
            expectStatus(await peerApi.tasks.update(task.id, {name: 'hijacked', type: 'free', is_done: true}), 404);
            expectStatus(await peerApi.tasks.remove(task.id), 404);
        });

        test('carryover ignores tasks of another user', async ({seed, peerApi}) => {
            const task = await seed.task();
            const res = await peerApi.tasks.carryover({fromMonth: task.month, toMonth: '2030-01-01', taskIds: [task.id], statuses: [true]});
            expectStatus(res, 201);
            expect(res.body).toEqual([]);
        });

        test('leave requests', async ({seed, peerApi}) => {
            const id = await seed.leave();
            expectStatus(await peerApi.leave.setStatus(id, 'approved'), 404);
            expectStatus(await peerApi.leave.remove(id), 404);
        });

        test('"delete all" only deletes the caller\'s own requests', async ({api, seed, peerApi}) => {
            const id = await seed.leave();
            expectStatus(await peerApi.leave.removeAll(), 200);
            expect((await api.leave.list()).body).toEqual(expect.arrayContaining([expect.objectContaining({id})]));
        });

        test('services and events', async ({seed, peerApi}) => {
            const service = await seed.service();
            const event = await seed.event(service.id);
            expectStatus(await peerApi.services.update(service.id, build.service()), 404);
            expectStatus(await peerApi.services.remove(service.id), 404);
            expectStatus(await peerApi.services.updateEvent(event.id, {eventDate: new Date().toISOString()}), 404);
            expectStatus(await peerApi.services.removeEvent(event.id), 404);
        });

        test('wish lists that are not shared', async ({seed, peerApi}) => {
            const list = await seed.wishlist();
            const item = await seed.wishItem(list.id);
            expectStatus(await peerApi.wishlists.items(list.id), 404);
            expectStatus(await peerApi.wishlists.sharedUsers(list.id), 404);
            expectStatus(await peerApi.wishlists.rename(list.id, 'hijacked'), 404);
            expectStatus(await peerApi.wishlists.remove(list.id), 404);
            expectStatus(await peerApi.wishlists.updateItem(item.id, {name: 'hijacked'}), 404);
            expectStatus(await peerApi.wishlists.removeItem(item.id), 404);
        });

        test('known bug: an event can be attached to another user\'s service', async ({seed, peerApi}) => {
            test.fail(true, 'Known bug (IDOR): POST /api/events does not check that serviceId belongs to the caller');
            const service = await seed.service();
            const res = await peerApi.services.createEvent({serviceId: service.id, eventDate: new Date().toISOString()});
            expectStatus(res, 404);
        });
    });
});
