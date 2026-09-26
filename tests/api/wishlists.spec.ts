import {z} from 'zod';
import {test, expect} from '@src/fixtures';
import {expectContract, expectMessage, expectStatus} from '@src/api/assertions';
import {build} from '@src/data/builders';
import {WishList, WishListEntry, WishListItem} from '@src/schemas';

test.describe('Wish lists API', {tag: '@api'}, () => {
    test('creates a wish list that the owner sees as not shared', {tag: '@smoke'}, async ({api, seed}) => {
        const list = await seed.wishlist();

        const entry = expectContract(await api.wishlists.list(), 200, z.array(WishListEntry)).find(l => l.id === list.id);
        expect(entry).toMatchObject({name: list.name, is_shared: false, shared_by_username: null, access_level: null});
    });

    test('a wish list needs a name', async ({api}) => {
        expectMessage(await api.wishlists.create(''), 400, 'Wish list name is required');
    });

    test('renames a wish list', async ({api, seed}) => {
        const list = await seed.wishlist();
        const name = build.wishlistName();
        expect(expectContract(await api.wishlists.rename(list.id, name), 200, WishList).name).toBe(name);
        expectMessage(await api.wishlists.rename(list.id, ''), 400, 'Wish list name is required');
    });

    test('delete returns 204 and removes its items too', async ({api}) => {
        const list = expectContract(await api.wishlists.create(build.wishlistName()), 201, WishList);
        const item = expectContract(await api.wishlists.addItem(list.id, build.wishItem()), 201, WishListItem);

        expectStatus(await api.wishlists.remove(list.id), 204);
        expectStatus(await api.wishlists.items(list.id), 404);
        expectStatus(await api.wishlists.removeItem(item.id), 404);
    });

    test.describe('items', () => {
        test('a free item has no currency or amount', async ({seed}) => {
            const list = await seed.wishlist();
            const item = await seed.wishItem(list.id, build.wishItem({currency: 'USD', amount: 10}));
            expect(item).toMatchObject({is_paid: false, is_done: false, currency: null, amount: null});
        });

        test('a paid item keeps its currency and amount', async ({api, seed}) => {
            const list = await seed.wishlist();
            const item = await seed.wishItem(list.id, build.paidWishItem({currency: 'EUR', amount: 49.9}));

            expect(item).toMatchObject({is_paid: true, currency: 'EUR', amount: '49.90'});
            const items = expectContract(await api.wishlists.items(list.id), 200, z.array(WishListItem));
            expect(items.map(i => i.id)).toEqual([item.id]);
        });

        const invalid: Array<[string, Record<string, unknown>, string]> = [
            ['without a name', {name: ''}, 'Wish list item name is required'],
            ['paid without an amount', {is_paid: true, currency: 'USD', amount: undefined}, 'A valid amount is required for paid items'],
            ['paid with a non-numeric amount', {is_paid: true, currency: 'USD', amount: 'lots'}, 'A valid amount is required for paid items'],
            ['paid without a currency', {is_paid: true, amount: 10, currency: undefined}, 'Currency is required for paid items'],
        ];
        for (const [title, overrides, message] of invalid) {
            test(`rejects an item ${title}`, async ({api, seed}) => {
                const list = await seed.wishlist();
                expectMessage(await api.wishlists.addItem(list.id, {...build.wishItem(), ...overrides}), 400, message);
            });
        }

        test('partial update changes only the sent fields', async ({api, seed}) => {
            const list = await seed.wishlist();
            const item = await seed.wishItem(list.id, build.paidWishItem());

            const done = expectContract(await api.wishlists.updateItem(item.id, {is_done: true}), 200, WishListItem);
            expect(done).toMatchObject({is_done: true, name: item.name, amount: item.amount, currency: item.currency});

            const renamed = expectContract(await api.wishlists.updateItem(item.id, {name: 'renamed'}), 200, WishListItem);
            expect(renamed).toMatchObject({name: 'renamed', is_done: true});
        });

        test('an update with no fields is rejected', async ({api, seed}) => {
            const item = await seed.wishItem((await seed.wishlist()).id);
            expectMessage(await api.wishlists.updateItem(item.id, {}), 400, /At least one field/);
        });

        test('items cannot be added to a missing wish list', async ({api}) => {
            expectStatus(await api.wishlists.addItem(2_000_000_000, build.wishItem()), 404);
        });
    });
});
