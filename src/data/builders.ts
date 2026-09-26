import type {LeaveInput, ServiceInput, TaskInput, WishItemInput} from '../api/clients';
import {isoDay, monthStart} from './dates';

let counter = 0;

/** Unique, human-readable suffix — safe across parallel workers and reruns. */
export function uid(): string {
    counter += 1;
    return `${Date.now().toString(36)}${process.pid.toString(36)}${counter}`;
}

export const QA_PREFIX = 'QA';

export const build = {
    freeTask: (overrides: TaskInput = {}): TaskInput => ({
        name: `${QA_PREFIX} free task ${uid()}`,
        type: 'free',
        month: monthStart(),
        ...overrides,
    }),

    paidTask: (overrides: TaskInput = {}): TaskInput => ({
        name: `${QA_PREFIX} paid task ${uid()}`,
        type: 'paid',
        price: 120,
        currency: 'UAH',
        month: monthStart(),
        ...overrides,
    }),

    leave: (overrides: LeaveInput = {}): LeaveInput => ({
        type: 'vacation',
        start_date: isoDay(10),
        end_date: isoDay(14),
        ...overrides,
    }),

    service: (overrides: ServiceInput = {}): ServiceInput => ({
        name: `${QA_PREFIX} service ${uid()}`,
        countType: 'negative',
        costType: 'per_session',
        totalQuantity: 10,
        cost: 250,
        icon: null,
        ...overrides,
    }),

    wishlistName: () => `${QA_PREFIX} wishlist ${uid()}`,

    wishItem: (overrides: WishItemInput = {}): WishItemInput => ({
        name: `${QA_PREFIX} item ${uid()}`,
        is_paid: false,
        ...overrides,
    }),

    paidWishItem: (overrides: WishItemInput = {}): WishItemInput => ({
        name: `${QA_PREFIX} paid item ${uid()}`,
        is_paid: true,
        currency: 'EUR',
        amount: 49.9,
        ...overrides,
    }),
};
