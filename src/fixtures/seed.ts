import type {Api, LeaveInput, ServiceInput, TaskInput, WishItemInput} from '../api/clients';
import {expectContract} from '../api/assertions';
import {build} from '../data/builders';
import {LeaveCreated, ScheduledEvent, Service, Task, WishList, WishListItem} from '../schemas';
import type {Cleanup} from './cleanup';

/**
 * Creates test data through the API (fast, no UI) and registers its deletion.
 * Every call validates the response contract, so seeding doubles as a contract check.
 */
export function createSeed(api: Api, cleanup: Cleanup) {
    return {
        async task(input: TaskInput = build.freeTask()) {
            const task = expectContract(await api.tasks.create(input), 201, Task);
            cleanup.add(`task ${task.id}`, () => api.tasks.remove(task.id));
            return task;
        },

        async leave(input: LeaveInput = build.leave()) {
            const {leaveId} = expectContract(await api.leave.create(input), 201, LeaveCreated);
            cleanup.add(`leave ${leaveId}`, () => api.leave.remove(leaveId));
            return leaveId;
        },

        async service(input: ServiceInput = build.service()) {
            const service = expectContract(await api.services.create(input), 201, Service);
            cleanup.add(`service ${service.id}`, () => api.services.remove(service.id));
            return service;
        },

        async event(serviceId: number, eventDate = new Date(Date.now() + 86_400_000).toISOString()) {
            const event = expectContract(await api.services.createEvent({serviceId, eventDate}), 201, ScheduledEvent);
            cleanup.add(`event ${event.id}`, () => api.services.removeEvent(event.id));
            return event;
        },

        async wishlist(name = build.wishlistName()) {
            const list = expectContract(await api.wishlists.create(name), 201, WishList);
            cleanup.add(`wishlist ${list.id}`, () => api.wishlists.remove(list.id));
            return list;
        },

        async wishItem(wishlistId: number, input: WishItemInput = build.wishItem()) {
            const item = expectContract(await api.wishlists.addItem(wishlistId, input), 201, WishListItem);
            cleanup.add(`wish item ${item.id}`, () => api.wishlists.removeItem(item.id));
            return item;
        },
    };
}

export type Seed = ReturnType<typeof createSeed>;
