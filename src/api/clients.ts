import type {APIRequestContext} from '@playwright/test';
import {BaseApi, type SendOptions} from './http';
import type {Currency} from '../schemas';

export interface Credentials {
    username: string;
    password: string;
}

export class AuthApi extends BaseApi {
    register(body: Credentials & {registrationCode: string}) {
        return this.send('POST', '/api/register', {data: body, token: null});
    }

    login(body: Partial<Credentials>) {
        return this.send('POST', '/api/login', {data: body, token: null});
    }

    resetPassword(body: {username: string; registrationCode: string; newPassword: string}) {
        return this.send('POST', '/api/reset-password', {data: body, token: null});
    }
}

export class UserApi extends BaseApi {
    me(options?: SendOptions) {
        return this.send('GET', '/api/me', options);
    }

    updateTabOrder(tabOrder: unknown) {
        return this.send('PUT', '/api/users/me/tab-order', {data: {tabOrder}});
    }

    updateAllowances(body: {vacation_days_per_year?: number; sick_days_per_year?: number}) {
        return this.send('PUT', '/api/settings', {data: body});
    }

    changePassword(body: {registrationCode: string; newPassword: string}) {
        return this.send('PUT', '/api/user/password', {data: body});
    }
}

export interface TaskInput {
    name?: string;
    type?: 'free' | 'paid' | string;
    month?: string;
    price?: number | string | null;
    currency?: Currency | string | null;
}

export interface TaskUpdate extends TaskInput {
    is_done?: boolean;
}

export class TasksApi extends BaseApi {
    list(month?: string, isDone?: boolean) {
        const params: Record<string, string> = {};
        if (month) params.month = month;
        if (isDone !== undefined) params.is_done = String(isDone);
        return this.send('GET', '/api/tasks', {params});
    }

    today() {
        return this.send('GET', '/api/tasks/today');
    }

    create(body: TaskInput) {
        return this.send('POST', '/api/tasks', {data: body});
    }

    update(id: number, body: TaskUpdate) {
        return this.send('PUT', `/api/tasks/${id}`, {data: body});
    }

    remove(id: number) {
        return this.send('DELETE', `/api/tasks/${id}`);
    }

    carryover(body: {fromMonth?: string; toMonth?: string; taskIds?: number[]; statuses?: boolean[]}) {
        return this.send('POST', '/api/tasks/carryover', {data: body});
    }
}

export interface LeaveInput {
    type?: 'vacation' | 'sick' | string;
    start_date?: string;
    end_date?: string;
}

export class LeaveApi extends BaseApi {
    list() {
        return this.send('GET', '/api/leave');
    }

    create(body: LeaveInput) {
        return this.send('POST', '/api/leave', {data: body});
    }

    setStatus(id: number, status: string) {
        return this.send('PUT', `/api/leave/${id}/status`, {data: {status}});
    }

    archiveApproved() {
        return this.send('POST', '/api/leave/reset');
    }

    removeAll() {
        return this.send('DELETE', '/api/leave/all');
    }

    remove(id: number) {
        return this.send('DELETE', `/api/leave/${id}`);
    }
}

export interface ServiceInput {
    name?: string;
    countType?: 'positive' | 'negative' | string;
    costType?: 'group' | 'per_session' | string;
    totalQuantity?: number | null;
    cost?: number | string;
    icon?: string | null;
}

export class ServicesApi extends BaseApi {
    overview() {
        return this.send('GET', '/api/services');
    }

    create(body: ServiceInput) {
        return this.send('POST', '/api/services', {data: body});
    }

    update(id: number, body: ServiceInput) {
        return this.send('PUT', `/api/services/${id}`, {data: body});
    }

    remove(id: number) {
        return this.send('DELETE', `/api/services/${id}`);
    }

    createEvent(body: {serviceId?: number; eventDate?: string}) {
        return this.send('POST', '/api/events', {data: body});
    }

    updateEvent(id: number, body: {eventDate?: string}) {
        return this.send('PUT', `/api/events/${id}`, {data: body});
    }

    removeEvent(id: number) {
        return this.send('DELETE', `/api/events/${id}`);
    }
}

export interface WishItemInput {
    name?: string;
    is_paid?: boolean;
    currency?: string;
    amount?: number | string;
}

export class WishlistsApi extends BaseApi {
    list() {
        return this.send('GET', '/api/wishlists');
    }

    create(name?: string) {
        return this.send('POST', '/api/wishlists', {data: {name}});
    }

    rename(id: number, name?: string) {
        return this.send('PUT', `/api/wishlists/${id}`, {data: {name}});
    }

    remove(id: number) {
        return this.send('DELETE', `/api/wishlists/${id}`);
    }

    share(id: number, body: {sharedWithUsername?: string; accessLevel?: string}) {
        return this.send('POST', `/api/wishlists/${id}/share`, {data: body});
    }

    sharedUsers(id: number) {
        return this.send('GET', `/api/wishlists/${id}/share`);
    }

    unshare(id: number, userId: number) {
        return this.send('DELETE', `/api/wishlists/${id}/share/${userId}`);
    }

    items(id: number) {
        return this.send('GET', `/api/wishlists/${id}/items`);
    }

    addItem(id: number, body: WishItemInput) {
        return this.send('POST', `/api/wishlists/${id}/items`, {data: body});
    }

    updateItem(itemId: number, body: WishItemInput & {is_done?: boolean}) {
        return this.send('PUT', `/api/wishlists/items/${itemId}`, {data: body});
    }

    removeItem(itemId: number) {
        return this.send('DELETE', `/api/wishlists/items/${itemId}`);
    }
}

export function createApi(http: APIRequestContext, token?: string) {
    return {
        auth: new AuthApi(http, token),
        user: new UserApi(http, token),
        tasks: new TasksApi(http, token),
        leave: new LeaveApi(http, token),
        services: new ServicesApi(http, token),
        wishlists: new WishlistsApi(http, token),
    };
}

export type Api = ReturnType<typeof createApi>;
