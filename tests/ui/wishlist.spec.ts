import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract, expectStatus} from '@src/api/assertions';
import {build, uid} from '@src/data/builders';
import {WishListItem} from '@src/schemas';

test.describe('Wish list', {tag: '@ui'}, () => {
    test('a new wish list gets its own tab', {tag: '@smoke'}, async ({app, wishlistPage, api}) => {
        await app.open('wishlist');
        const name = build.wishlistName();
        const list = await wishlistPage.addWishlist(name);

        await expect(wishlistPage.tab(list.id)).toContainText(name);
        await api.wishlists.remove(list.id);
    });

    test('a paid item shows its amount and is saved', async ({app, wishlistPage, seed, api}) => {
        const list = await seed.wishlist();
        await app.open('wishlist');
        await wishlistPage.select(list.id);

        const name = `QA ui item ${uid()}`;
        const item = await wishlistPage.addItem(list.id, {name, amount: '49.90', currency: 'EUR'});

        await expect(wishlistPage.row(item.id)).toContainText(name);
        await expect(wishlistPage.row(item.id)).toContainText('EUR 49.90');
        const saved = expectContract(await api.wishlists.items(list.id), 200, z.array(WishListItem));
        expect(saved).toEqual([expect.objectContaining({id: item.id, is_paid: true, currency: 'EUR', amount: '49.90'})]);
    });

    test('items can be ticked off and deleted', async ({app, wishlistPage, seed}) => {
        const list = await seed.wishlist();
        const item = await seed.wishItem(list.id);
        await app.open('wishlist');
        await wishlistPage.select(list.id);

        await wishlistPage.toggleItem(item.id);
        await expect(wishlistPage.row(item.id).getByRole('checkbox')).toBeChecked();

        await wishlistPage.removeItem(item.id);
        await expect(wishlistPage.row(item.id)).toHaveCount(0);
    });

    test('a list shared by another user shows up for the recipient', async ({app, wishlistPage, peerSeed, peerApi, qaUser}) => {
        const list = await peerSeed.wishlist();
        const item = await peerSeed.wishItem(list.id);
        expectStatus(await peerApi.wishlists.share(list.id, {sharedWithUsername: qaUser.username}), 201);

        await app.open('wishlist');
        await expect(wishlistPage.tab(list.id)).toBeVisible();
        await wishlistPage.select(list.id);
        await expect(wishlistPage.row(item.id)).toContainText(item.name);
    });
});
