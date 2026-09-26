import type {Api, LeaveInput, ServiceInput, TaskInput, WishItemInput} from '../api/clients';
import {expectContract} from '../api/assertions';
import {build} from '../data/builders';
import {LeaveCreated, ScheduledEvent, Service, Task, WishList, WishListItem} from '../schemas';

/**
 * Creates test data through the API — fast, no UI. Every call validates the response
 * contract, so seeding doubles as a contract check. No cleanup needed: deleting the
 * test's user removes all of it.
 */
export function createSeed(api: Api) {
    return {
        async task(input: TaskInput = build.freeTask()) {
            return expectContract(await api.tasks.create(input), 201, Task);
        },

        async leave(input: LeaveInput = build.leave()) {
            return expectContract(await api.leave.create(input), 201, LeaveCreated).leaveId;
        },

        async service(input: ServiceInput = build.service()) {
            return expectContract(await api.services.create(input), 201, Service);
        },

        async event(serviceId: number, eventDate = new Date(Date.now() + 86_400_000).toISOString()) {
            return expectContract(await api.services.createEvent({serviceId, eventDate}), 201, ScheduledEvent);
        },

        async wishlist(name = build.wishlistName()) {
            return expectContract(await api.wishlists.create(name), 201, WishList);
        },

        async wishItem(wishlistId: number, input: WishItemInput = build.wishItem()) {
            return expectContract(await api.wishlists.addItem(wishlistId, input), 201, WishListItem);
        },
    };
}

export type Seed = ReturnType<typeof createSeed>;
