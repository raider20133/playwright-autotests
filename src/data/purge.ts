import {z} from 'zod';
import type {Api} from '../api/clients';
import {expectContract} from '../api/assertions';
import {ServicesOverview, Task, WishListEntry} from '../schemas';
import {monthStart} from './dates';

/**
 * Removes everything a QA user owns. Runs once per worker before tests start, so a crashed
 * previous run can never leak data into this one.
 */
export async function purgeUserData(api: Api): Promise<void> {
    await api.leave.removeAll();

    const wishlists = expectContract(await api.wishlists.list(), 200, z.array(WishListEntry));
    for (const list of wishlists.filter(l => !l.is_shared)) await api.wishlists.remove(list.id);

    // Events are removed by ON DELETE CASCADE
    const {services} = expectContract(await api.services.overview(), 200, ServicesOverview);
    for (const service of services) await api.services.remove(service.id);

    for (let offset = -3; offset <= 3; offset++) {
        const tasks = expectContract(await api.tasks.list(monthStart(offset)), 200, z.array(Task));
        for (const task of tasks) await api.tasks.remove(task.id);
    }
}
