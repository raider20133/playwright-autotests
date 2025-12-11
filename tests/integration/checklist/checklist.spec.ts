import {test, expect} from '../../fixtures/fixtures';
// Importing USER, and PASSWORD from Playwright config for direct API calls.
import {USER, PASSWORD} from "../../../playwright.config";


/**
 * @enum {string} selectors
 * @description Enumeration of data-testid selectors and other specific CSS selectors used in the Checklist page.
 */
enum selectors {
    /** Selector for the desktop navigation tab for the Checklist. */
    tabChecklist = '[data-testid="menu-item-checklist-desktop"]',
    /** Button to open the "Add Task" form. */
    btnAddTask = '[data-testid="add-task-button"]',
    /** Button within the form to finalize and create the task. */
    btnCreateTask = '[data-testid="task-form-add-button"]',
    /** Selector for the message area of a standard UI alert (e.g., validation message). */
    allerMessage = '.MuiAlert-message',
    /** Base selector for a single task list item, typically used with a dynamic ID. */
    taskItem = 'task-item',
    /** Base selector for the checkbox associated with a task, typically used with a dynamic ID. */
    taskCheckbox = 'task-checkbox',
    /** Input field for entering the task name in the creation form. */
    inputForName = '[data-testid="task-form-name-input"] input',
    /** Select input for choosing the task type (Free/Paid). */
    selectInputType = '[data-testid="task-form-type-select"]',
    /** Input field for entering the price (amount) for Paid tasks. */
    inputForPrice = '[data-testid="task-form-price-input"] input',
    /** Selector for all task list items displayed in the "Close Month" confirmation modal. */
    allTaskInModalWindow = '[data-testid="all-tasks-list"] li',
    /** Selector for all task list items displayed in the next month view. */
    allTaskListInNextMonth = '[data-testid="tasks-list"] li',
    /** Button to open the "Close Month" modal/process. */
    btnCloseMonth = '[data-testid="close-month-button"]',
    /** Button to navigate to the next month view. */
    btnNextMonth = '[data-testid="next-month-button"]',
    /** Confirmation button inside the "Close Month" modal. */
    btnConfirmCloseMonth = '[data-testid="close-month-confirm-button"]',
    /** Message displayed when no tasks are found for the current month. */
    messageWithoutTasks = '[data-testid="no-tasks-found"]'
}

/**
 * @type {string}
 * @description The API endpoint URL used for navigation to the tasks tab and managing tasks (POST, GET, DELETE).
 */
const navigationTabUrl: string = '/api/tasks'

/**
 * @enum {string} TaskType
 * @description Defines the possible task status/type (Free or Paid).
 */
enum TaskType {
    Free = 'Free',
    Paid = 'Paid'
}

/**
 * @typedef {200 | 201 | 204} codes
 * @description Defines common successful HTTP status codes used for API interactions.
 */
type codes = 200 | 201 | 204;

/**
 * @interface StatusCode
 * @description Maps descriptive status names to their HTTP status codes.
 */
interface StatusCode {
    /** HTTP 200 OK - Standard success response. */
    OK: codes,
    /** HTTP 201 Created - Resource successfully created. */
    Created: codes,
    /** HTTP 204 No Content - Request processed successfully, no body returned (common for DELETE). */
    NoContent: codes
}

/**
 * @constant {StatusCode} statusCode
 * @description Object containing commonly used successful status codes for quick reference.
 */
const statusCode: StatusCode = {
    OK: 200,
    Created: 201,
    NoContent: 204
};

/**
 * @type {number}
 * @description Stores the ID of the most recently created task, retrieved from the successful POST response.
 */
let createdId: number;

/**
 * @constant {string} taskName
 * @description A dynamic, unique name used for task creation tests to avoid collisions.
 */
const taskName = `Monthly task ${Date.now()}`;

/**
 * @constant {string} value
 * @description The price value ('120') used for paid task creation tests.
 */
const value: string = '120';

/**
 * @type {string}
 * @description The attribute name used for locating elements, typically 'data-testid' in this context.
 */
const universalSelector: string = 'data-testid'

/**
 * @async
 * @function fillTaskForm
 * @description Opens the add task form, fills in the task name, selects the type, and optionally fills the price.
 * @param {import('@playwright/test').Page} page - The Playwright Page object.
 * @param {string} nameValue - The name to give the new task.
 * @param {TaskType} typeValue - The type of task ('Free' or 'Paid').
 * @param {string} [priceValue] - The price for the task (required if type is 'Paid').
 * @returns {Promise<void>}
 */
async function fillTaskForm({page}, nameValue: string, typeValue: TaskType, priceValue?: string) {
    await page.locator(selectors.btnAddTask).click()
    await page.locator(selectors.inputForName).fill(nameValue);
    await page.locator(selectors.selectInputType).click();
    await page.locator(`role=option[name="${typeValue}"]`).click();

    if (typeValue === TaskType.Paid && priceValue) {
        await page.locator(selectors.inputForPrice).fill(priceValue)
    }
}

/**
 * @async
 * @function submitTaskForm
 * @description Submits the task creation form and waits for the API response to retrieve the ID of the newly created task.
 * @param {{interception: any}} object - The Playwright fixture object containing the custom `interception` function.
 * @returns {Promise<void>}
 */
async function submitTaskForm({interception}) {
    // Submit the form and wait for the POST (creation) response
    const responsePromise = await interception.interceptions([{
        url: navigationTabUrl,
        method: 'POST',
        statusCode: statusCode.Created
    }], selectors.btnCreateTask, true)

    // Extract the created ID from the API response body
    const data = await responsePromise[0].json();
    createdId = data.id;
}

/**
 * @async
 * @function checkDataInTask
 * @description Toggles the task checkbox and verifies the displayed task name and type/price based on the globally stored `createdId`.
 * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
 * @param {string} nameValue - The expected task name.
 * @param {TaskType} typeValue - The expected task type ('Free' or 'Paid').
 * @param {string} [priceValue] - The expected price value (if type is 'Paid').
 * @returns {Promise<void>}
 */
async function checkDataInTask({page}, nameValue: string, typeValue: TaskType, priceValue?: string) {
    // Verify initial checkbox state and click it
    const checkbox = page.locator(`[${universalSelector}="${selectors.taskCheckbox}-${createdId}"]`)
    // Using a regex check for the Mui-checked class to ensure the state is unchecked initially
    await expect(checkbox).not.toHaveClass(/Mui-checked/)
    await checkbox.click();
    // Verify the state is checked after the click
    await expect(checkbox).toHaveClass(/(^|\s)Mui-checked(\s|$)/)

    // Verify task name
    const name = page.locator(`[${universalSelector}="${selectors.taskItem}-${createdId}"] div span`)
    await expect(name).toHaveText(nameValue)

    // Verify task type/price
    const type = page.locator(`[${universalSelector}="${selectors.taskItem}-${createdId}"] p`)
    if (typeValue === TaskType.Free) {
        await expect(type).toHaveText('free')
    } else {
        // Use RegExp to handle currency formatting (e.g., '₴120.00' is expected)
        await expect(type).toHaveText(new RegExp(`₴${priceValue}\\.00`));
    }
}

/**
 * @async
 * @function removeTask
 * @description Clicks the delete button for the globally stored `createdId` and waits for the task to be removed from the DOM and the successful DELETE API response.
 * @param {{page: import('@playwright/test').Page, interception: any}} object - The Playwright test fixture object containing page and interception.
 * @returns {Promise<void>}
 */
async function removeTask({page, interception}) {
    // Click the delete button and wait for the DELETE API response (204 No Content)
    await interception.interceptions([{
        url: navigationTabUrl,
        method: 'DELETE',
        statusCode: statusCode.NoContent
    }], `[data-testid="task-delete-button-${createdId}"]`)

    // Verify the task element is no longer visible in the DOM
    await expect(page.locator(`[${universalSelector}="${selectors.taskItem}-${createdId}"]`)).toHaveCount(0)
}

/**
 * @async
 * @function checkListWithTasks
 * @description Locates list items based on a selector and verifies that all found items are visible on the page.
 * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
 * @param {string} selector - The CSS selector for the list items (e.g., `selectors.allTaskInModalWindow`).
 * @returns {Promise<void>}
 */
async function checkListWithTasks({page}, selector: string) {
    const items = page.locator(selector);

    for (const el of await items.all()) {
        await expect(el).toBeVisible();
    }
}

/**
 * @description Test suite for 'Checklist' functionality, covering task creation, validation, status toggling, and the month closure/carryover process.
 */
test.describe('@E2E Checklist', () => {

    /**
     * @description Navigates to the base URL, signs in, and navigates to the 'Checklist' tab before each test in this suite.
     * @param {{page: import('@playwright/test').Page, login: any, navigation: any}} object - The Playwright test fixture object containing the page, login, and navigation objects.
     */
    test.beforeEach(async ({page, login, navigation}) => {
        await page.goto('/');
        await login.signIn(USER, PASSWORD, statusCode.OK);
        // Navigate to the Checklist tab and wait for the initial API load of tasks
        await navigation.gotoTabRequests(navigationTabUrl, statusCode.OK, selectors.tabChecklist);
    });

    /**
     * @test Tests the successful creation, status toggling, and removal of a new task with the 'Free' type.
     * @param {{page: import('@playwright/test').Page, interception: any}} object - The Playwright test fixture object containing the page and interception.
     */
    test('Creating new task with free amount', async ({page, interception}) => {

        await fillTaskForm({page}, taskName, TaskType.Free)
        await submitTaskForm({interception})
        await checkDataInTask({page}, taskName, TaskType.Free)
        await removeTask({page, interception})
    })

    /**
     * @test Tests the successful creation, status toggling, and removal of a new task with the 'Paid' type and a specified price.
     * @param {{page: import('@playwright/test').Page, interception: any}} object - The Playwright test fixture object containing the page and interception.
     */
    test('Creating new task with amount ', async ({page, interception}) => {

        await fillTaskForm({page}, taskName, TaskType.Paid, value)
        await submitTaskForm({interception})
        await checkDataInTask({page}, taskName, TaskType.Paid, value)
        await removeTask({page, interception})
    })

    /**
     * @test Tests the validation message when attempting to create a task without the required name field being filled.
     * @param {{page: import('@playwright/test').Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Validation creating task', async ({page}) => {

        // Open form and attempt submission without filling required fields
        await page.locator(selectors.btnAddTask).click()
        await page.locator(selectors.btnCreateTask).click()

        // Verify the expected validation error message is displayed
        await expect(page.locator(selectors.allerMessage)).toHaveText('Task name is required.')
    })

    /**
     * @test Tests the complete workflow of closing the current month, carrying over tasks (one completed, one uncompleted), and navigating to the next month view. Includes cleanup of carried-over tasks.
     * @param {{page: import('@playwright/test').Page, interception: any}} object - The Playwright test fixture object containing the page and interception.
     */
    test('Moving tasks to next month free and paid type', async ({page, interception}) => {
        // 1. Create a Free task and check it (completed)
        await fillTaskForm({page}, `${taskName} Free`, TaskType.Free)
        await submitTaskForm({interception})
        const freeTaskCheckbox = page.locator(`[${universalSelector}="${selectors.taskCheckbox}-${createdId}"]`)
        await freeTaskCheckbox.click(); // Mark it as completed

        // 2. Create a Paid task (uncompleted)
        await fillTaskForm({page}, `${taskName} Paid`, TaskType.Paid, value)
        await submitTaskForm({interception})
        // The Paid task is left unchecked (uncompleted)

        // 3. Open the "Close Month" modal
        await page.locator(selectors.btnCloseMonth).click()

        // 4. Verify both tasks are listed in the modal
        await checkListWithTasks({page}, selectors.allTaskInModalWindow)

        // 5. Confirm closing the month and wait for the API carryover response
        await interception.interceptions([{
            url: 'api/tasks/carryover',
            method: 'POST',
            statusCode: statusCode.Created
        }], selectors.btnConfirmCloseMonth)

        // 6. Verify the current month view is now empty
        await expect(page.locator(selectors.messageWithoutTasks)).toHaveText('No tasks found for this month.')

        // 7. Navigate to the next month
        await page.locator(selectors.btnNextMonth).click()

        // 8. Verify the 2 tasks have been carried over to the next month
        await checkListWithTasks({page}, selectors.allTaskListInNextMonth)

        // 9. Clean up by deleting the carried-over tasks
        const buttons = page.locator(`${selectors.allTaskListInNextMonth} [data-testid^="task-delete-button-"]`);
        const count: number = await buttons.count();

        for (let i: number = 0; i < count; i++) {
            // Click each delete button sequentially
            await buttons.nth(i).click();

            // Wait for the DELETE response for cleanup
            await interception.interceptions([{
                url: '/api/tasks',
                method: 'DELETE',
                statusCode: statusCode.NoContent
            }]);
        }
    })
})