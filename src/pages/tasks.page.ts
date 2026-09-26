import {expect, type Locator} from '@playwright/test';
import {BasePage} from './base.page';
import {Task} from '../schemas';

export interface NewTask {
    name: string;
    type: 'Free' | 'Paid';
    price?: string;
    currency?: 'UAH' | 'USD' | 'EUR';
}

export class TasksPage extends BasePage {
    readonly list: Locator = this.page.getByTestId('tasks-list');
    readonly emptyState: Locator = this.page.getByTestId('no-tasks-found');
    readonly addButton: Locator = this.page.getByTestId('add-task-button');
    readonly closeMonthButton: Locator = this.page.getByTestId('close-month-button');
    readonly form: Locator = this.page.getByTestId('task-form-modal');
    readonly closeMonthDialog: Locator = this.page.getByTestId('close-month-modal');

    item(id: number): Locator {
        return this.list.getByTestId(`task-item-${id}`);
    }

    /** Name + price block; completed tasks are struck through here. */
    label(id: number): Locator {
        return this.item(id).locator('.MuiListItemText-root');
    }

    checkbox(id: number): Locator {
        return this.list.getByTestId(`task-checkbox-${id}`).getByRole('checkbox');
    }

    /** Fills the "New Task" dialog and returns the task the API created. */
    async addTask(task: NewTask): Promise<Task> {
        await this.addButton.click();
        await this.form.getByTestId('task-form-name-input').getByRole('textbox').fill(task.name);
        await this.choose(this.form.getByTestId('task-form-type-select'), task.type);
        if (task.type === 'Paid') {
            await this.form.getByTestId('task-form-price-input').getByRole('spinbutton').fill(task.price ?? '');
            if (task.currency) await this.choose(this.form.getByTestId('task-form-currency-select'), task.currency);
        }
        const response = await this.expectRequest('POST', '/api/tasks', 201, () =>
            this.form.getByTestId('task-form-add-button').click());
        return Task.parse(await response.json());
    }

    async toggle(id: number): Promise<void> {
        await this.expectRequest('PUT', `/api/tasks/${id}`, 200, () => this.checkbox(id).click());
    }

    async remove(id: number): Promise<void> {
        await this.expectRequest('DELETE', `/api/tasks/${id}`, 204, () =>
            this.list.getByTestId(`task-delete-button-${id}`).click());
    }

    async nextMonth(): Promise<void> {
        await this.expectRequest('GET', '/api/tasks', 200, () => this.page.getByTestId('next-month-button').click());
    }

    async previousMonth(): Promise<void> {
        await this.expectRequest('GET', '/api/tasks', 200, () => this.page.getByTestId('prev-month-button').click());
    }

    async openCloseMonth(): Promise<void> {
        await this.expectRequest('GET', '/api/tasks', 200, () => this.closeMonthButton.click());
        await expect(this.closeMonthDialog).toBeVisible();
    }

    closeMonthItem(id: number): Locator {
        return this.closeMonthDialog.getByTestId(`task-item-${id}`);
    }

    async excludeFromCarryover(id: number): Promise<void> {
        await this.closeMonthDialog.getByTestId(`task-checkbox-${id}`).getByRole('checkbox').uncheck();
    }

    async confirmCloseMonth(): Promise<void> {
        await this.expectRequest('POST', '/api/tasks/carryover', 201, () =>
            this.closeMonthDialog.getByTestId('close-month-confirm-button').click());
        await expect(this.closeMonthDialog).toBeHidden();
    }
}
