import {expect, type Locator} from '@playwright/test';
import {BasePage} from './base.page';
import {WishList, WishListItem} from '../schemas';

const currencyLabel = {USD: '$ USD', EUR: '€ EUR', UAH: '₴ UAH'} as const;

export class WishlistPage extends BasePage {
    readonly tabs: Locator = this.page.getByTestId('wishlist-tabs');
    readonly table: Locator = this.page.getByTestId('wishlist-table');

    tab(id: number): Locator {
        return this.page.getByTestId(`wishlist-tab-${id}`);
    }

    row(itemId: number): Locator {
        return this.page.getByTestId(`wishlist-item-row-${itemId}`);
    }

    async addWishlist(name: string): Promise<WishList> {
        await this.page.getByTestId('add-wishlist-button').click();
        const dialog = this.page.getByTestId('add-wishlist-dialog');
        await dialog.getByTestId('add-wishlist-name-input').getByRole('textbox').fill(name);
        const response = await this.expectRequest('POST', '/api/wishlists', 201, () =>
            dialog.getByTestId('add-wishlist-add-button').click());
        await expect(dialog).toBeHidden();
        return WishList.parse(await response.json());
    }

    async select(id: number): Promise<void> {
        const tab = this.tab(id);
        await expect(tab).toBeVisible();
        // The first tab is selected on load and its items are already fetched; clicking it again sends nothing
        if (await tab.getAttribute('aria-selected') === 'true') return;
        await this.expectRequest('GET', `/api/wishlists/${id}/items`, 200, () => tab.click());
    }

    async addItem(listId: number, item: {name: string; amount?: string; currency?: keyof typeof currencyLabel}): Promise<WishListItem> {
        await this.page.getByTestId(`add-item-button-${listId}`).click();
        const dialog = this.page.getByTestId('add-item-dialog');
        await dialog.getByTestId('add-item-name-input').getByRole('textbox').fill(item.name);
        if (item.amount) {
            await dialog.getByTestId('add-item-is-paid-checkbox').getByRole('checkbox').check();
            if (item.currency) await this.choose(dialog.getByTestId('add-item-currency-select'), currencyLabel[item.currency]);
            await dialog.getByTestId('add-item-amount-input').getByRole('spinbutton').fill(item.amount);
        }
        const response = await this.expectRequest('POST', `/api/wishlists/${listId}/items`, 201, () =>
            dialog.getByTestId('add-item-add-button').click());
        await expect(dialog).toBeHidden();
        return WishListItem.parse(await response.json());
    }

    async toggleItem(itemId: number): Promise<void> {
        await this.expectRequest('PUT', `/api/wishlists/items/${itemId}`, 200, () =>
            this.page.getByTestId(`wishlist-item-checkbox-${itemId}`).getByRole('checkbox').click());
    }

    async removeItem(itemId: number): Promise<void> {
        await this.expectRequest('DELETE', `/api/wishlists/items/${itemId}`, 204, () =>
            this.page.getByTestId(`wishlist-item-delete-button-${itemId}`).click());
    }
}
