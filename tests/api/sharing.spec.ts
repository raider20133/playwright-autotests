import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {build} from '@src/data/builders';
import {ShareCreated, SharedUser, WishListEntry, WishListItem} from '@src/schemas';

test.describe('Wish list sharing API', {tag: '@api'}, () => {
    test('a shared list is visible to the peer as view-only', {tag: '@smoke'}, async ({api, peerApi, seed, qaUser, peerUser}) => {
        const list = await seed.wishlist();
        const item = await seed.wishItem(list.id);

        const share = expectContract(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username}), 201, ShareCreated);
        expect(share.sharedWishList).toMatchObject({wish_list_id: list.id, shared_with_user_id: peerUser.id, shared_by_user_id: qaUser.id});

        const entry = expectContract(await peerApi.wishlists.list(), 200, z.array(WishListEntry)).find(l => l.id === list.id);
        expect(entry).toMatchObject({is_shared: true, shared_by_username: qaUser.username, access_level: 'view_only'});

        const items = expectContract(await peerApi.wishlists.items(list.id), 200, z.array(WishListItem));
        expect(items.map(i => i.id)).toEqual([item.id]);
    });

    test('view-only access does not allow changes', async ({api, peerApi, seed, peerUser}) => {
        const list = await seed.wishlist();
        const item = await seed.wishItem(list.id);
        expectStatus(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username}), 201);

        expectStatus(await peerApi.wishlists.addItem(list.id, build.wishItem()), 404);
        expectStatus(await peerApi.wishlists.updateItem(item.id, {is_done: true}), 404);
        expectStatus(await peerApi.wishlists.removeItem(item.id), 404);
        expectStatus(await peerApi.wishlists.rename(list.id, 'hijacked'), 404);
        expectStatus(await peerApi.wishlists.remove(list.id), 404);
        expectStatus(await peerApi.wishlists.share(list.id, {sharedWithUsername: 'anyone'}), 404);
    });

    test('the owner sees who a list is shared with, and can revoke it', async ({api, peerApi, seed, peerUser}) => {
        const list = await seed.wishlist();
        expectStatus(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username}), 201);

        const users = expectContract(await api.wishlists.sharedUsers(list.id), 200, z.array(SharedUser));
        expect(users).toEqual([expect.objectContaining({user_id: peerUser.id, username: peerUser.username, access_level: 'view_only'})]);

        expectStatus(await api.wishlists.unshare(list.id, peerUser.id), 204);
        const peerLists = expectContract(await peerApi.wishlists.list(), 200, z.array(WishListEntry));
        expect(peerLists.map(l => l.id)).not.toContain(list.id);
        expectStatus(await peerApi.wishlists.items(list.id), 404);
    });

    test('revoking a share that does not exist returns 404', async ({api, seed, peerUser}) => {
        const list = await seed.wishlist();
        expectStatus(await api.wishlists.unshare(list.id, peerUser.id), 404);
    });

    test('rejects invalid share requests', async ({api, seed, qaUser, peerUser}) => {
        const list = await seed.wishlist();

        expectMessage(await api.wishlists.share(list.id, {}), 400, 'Username of the user to share with is required');
        expectMessage(await api.wishlists.share(list.id, {sharedWithUsername: qaUser.username}), 400, 'Cannot share a wish list with yourself');
        expectMessage(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username, accessLevel: 'edit'}), 400,
            "Only 'view_only' access level is currently supported");
        expectMessage(await api.wishlists.share(list.id, {sharedWithUsername: `nobody_${Date.now()}`}), 404, 'User to share with not found');
    });

    test('sharing twice with the same user returns 409', async ({api, seed, peerUser}) => {
        const list = await seed.wishlist();
        expectStatus(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username}), 201);
        expectMessage(await api.wishlists.share(list.id, {sharedWithUsername: peerUser.username}), 409, 'Wish list already shared with this user');
    });
});
