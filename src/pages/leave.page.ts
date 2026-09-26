import {type Locator} from '@playwright/test';
import {BasePage} from './base.page';

export class LeavePage extends BasePage {
    readonly typeSelect: Locator = this.page.getByTestId('leave-request-type-select');
    readonly startDate: Locator = this.page.getByTestId('leave-request-start-date-input').locator('input');
    readonly endDate: Locator = this.page.getByTestId('leave-request-end-date-input').locator('input');
    readonly submit: Locator = this.page.getByTestId('leave-request-submit-button');
    readonly emptyState: Locator = this.page.getByTestId('no-leave-requests-found');
    readonly formError: Locator = this.page.getByRole('alert').filter({hasText: 'Please select both start and end dates.'});

    card(id: number): Locator {
        return this.page.getByTestId(`leave-request-${id}`);
    }

    status(id: number): Locator {
        return this.page.getByTestId(`leave-request-status-${id}`);
    }

    dates(id: number): Locator {
        return this.page.getByTestId(`leave-request-dates-${id}`);
    }

    type(id: number): Locator {
        return this.page.getByTestId(`leave-request-type-${id}`);
    }

    approveButton(id: number): Locator {
        return this.page.getByTestId(`approve-button-${id}`);
    }

    rejectButton(id: number): Locator {
        return this.page.getByTestId(`reject-button-${id}`);
    }

    /** Submits the form and returns the id of the created request. */
    async request(type: 'Vacation' | 'Sick Leave', start: string, end: string): Promise<number> {
        await this.choose(this.typeSelect, type);
        await this.startDate.fill(start);
        await this.endDate.fill(end);
        const response = await this.expectRequest('POST', '/api/leave', 201, () => this.submit.click());
        return (await response.json()).leaveId;
    }

    async approve(id: number): Promise<void> {
        await this.expectRequest('PUT', `/api/leave/${id}/status`, 200, () => this.approveButton(id).click());
    }

    async reject(id: number): Promise<void> {
        await this.expectRequest('PUT', `/api/leave/${id}/status`, 200, () => this.rejectButton(id).click());
    }

    async remove(id: number): Promise<void> {
        await this.expectRequest('DELETE', `/api/leave/${id}`, 204, () => this.page.getByTestId(`delete-button-${id}`).click());
    }

    /** "Delete All" asks for confirmation through window.confirm. */
    async removeAll(): Promise<void> {
        this.page.once('dialog', dialog => dialog.accept());
        await this.expectRequest('DELETE', '/api/leave/all', 200, () => this.page.getByTestId('delete-all-button').click());
    }
}
