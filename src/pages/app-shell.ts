import {expect, type Locator} from '@playwright/test';
import {BasePage} from './base.page';

export type Section = 'dashboard' | 'leave' | 'todo' | 'checklist' | 'wishlist' | 'calendar';

/** Section → the API call it loads, so navigation waits for data instead of sleeping. */
const loads: Partial<Record<Section, string>> = {
    leave: '/api/leave',
    checklist: '/api/tasks',
    wishlist: '/api/wishlists',
    todo: '/api/services',
};

export class AppShell extends BasePage {
    menuItem(section: Section): Locator {
        return this.page.getByTestId(`menu-item-${section}-desktop`);
    }

    /** Icon-only button without an accessible name (a11y gap), so it is located by position. */
    get logoutButton(): Locator {
        return this.page.getByRole('banner').getByRole('button').last();
    }

    async open(section: Section): Promise<void> {
        await this.page.goto('/');
        await this.goTo(section);
    }

    async goTo(section: Section): Promise<void> {
        const path = loads[section];
        if (path) await this.expectRequest('GET', path, 200, () => this.menuItem(section).click());
        else await this.menuItem(section).click();
    }

    async expectSignedIn(): Promise<void> {
        await expect(this.menuItem('dashboard')).toBeVisible();
    }
}
