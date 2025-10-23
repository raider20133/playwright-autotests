import {test, expect, Page} from '@playwright/test'
// Assuming the Login class is for handling user sign-in.
import Login from "../../support/login/login";
// Assuming the Interception class is for simplifying API request waiting.
import Interception from "../../support/interception/interception";
// Assuming the Navigation class is for navigation between tabs
import Navigation from "../../support/tabNavigation/tabNavigation";
// Importing USER, and PASSWORD from Playwright config for direct API calls.
import {USER, PASSWORD} from "../../../playwright.config";

/**
 * @enum {string} selectors
 * @description Enumeration of data-testid selectors and other specific CSS selectors used in the Checklist page.
 */
enum selectors {
    tabChecklist = '[data-testid="menu-item-checklist-desktop"]',
    btnAddTask = '[data-testid="add-task-button"]',
    btnCreateTask = '[data-testid="task-form-add-button"]',
    allerMessage = '.MuiAlert-message',
    taskItem = 'task-item',
    taskCheckbox = 'task-checkbox',
    inputForName = '[data-testid="task-form-name-input"] input',
    selectInputType = '[data-testid="task-form-type-select"]',
    inputForPrice = '[data-testid="task-form-price-input"] input'
}

/**
 * @type {string}
 * @description The API endpoint URL used for navigation to the tasks tab and managing tasks.
 */
const navigationTabUrl: string = '/api/tasks'

/**
 * @type {Login}
 * @description An instance of the Login class to handle sign-in operations.
 */
let login: Login;

/**
 * @type {Navigation}
 * @description An instance of the Navigation class to handle navigation between tabs.
 */
let navigation: Navigation

/**
 * @type {Interception}
 * @description An instance of the Interception class to manage API request waiting.
 */
let interception: Interception;

/**
 * @typedef {'Free' | 'Paid'} typeStatus
 * @description Defines the possible task status/type (Free or Paid).
 */
type typeStatus = 'Free' | 'Paid'

/**
 * @constant {typeStatus} Free
 * @description The string value for a free task type.
 */
const Free: typeStatus = 'Free'

/**
 * @constant {typeStatus} Paid
 * @description The string value for a paid task type.
 */
const Paid: typeStatus = 'Paid'

/**
 * @typedef {200 | 201 | 204} codes
 * @description Defines common successful HTTP status codes.
 */
type codes = 200 | 201 | 204;

/**
 * @interface StatusCode
 * @description Maps descriptive status names to their HTTP status codes.
 */
interface StatusCode {
    /** HTTP 200 OK. */
    OK: codes,
    /** HTTP 201 Created. */
    Created: codes,
    /** HTTP 204 No Content. */
    NoContent: codes
}

/**
 * @constant {StatusCode} statusCode
 * @description Object containing commonly used successful status codes.
 */
const statusCode: StatusCode = {
    OK: 200,
    Created: 201,
    NoContent: 204
};

/**
 * @type {number}
 * @description The ID of the most recently created task, retrieved from the POST response.
 */
let createdId: number;

/**
 * @constant {string} taskName
 * @description A dynamic name used for the task creation tests.
 */
const taskName = `Monthly task ${Date.now()}`;

/**
 * @constant {string} value
 * @description The price value used for paid tasks.
 */
const value: string = '120';

/**
 * @type {string}
 * @description The attribute used for locating elements, typically 'data-testid' in this context.
 */
let universalSelector: string = 'data-testid'

/**
 * @async
 * @function createTask
 * @description Opens the add task form, fills in the name, selects the type, and optionally fills the price.
 * @param {Page} page - The Playwright Page object.
 * @param {string} nameValue - The name to give the new task.
 * @param {string} typeValue - The type of task ('Free' or 'Paid').
 * @param {string} [priceValue] - The price for the task (required if type is 'Paid').
 * @returns {Promise<void>}
 */
async function createTask(page: Page, nameValue: string, typeValue: string, priceValue?: string) {
    await page.locator(selectors.btnAddTask).click()
    await page.locator(selectors.inputForName).fill(nameValue);
    await page.locator(selectors.selectInputType).click();
    await page.locator(`role=option[name="${typeValue}"]`).click();

    if (typeValue === Paid) {
        await page.locator(selectors.inputForPrice).fill(priceValue)
    }
}

/**
 * @async
 * @function checkDataInTask
 * @description Submits the new task form, retrieves the created ID, toggles the task checkbox, and verifies the displayed task name and type/price.
 * @param {Page} page - The Playwright Page object.
 * @param {string} nameValue - The expected task name.
 * @param {string} typeValue - The expected task type ('Free' or 'Paid').
 * @param {string} [priceValue] - The expected price value (if type is 'Paid').
 * @returns {Promise<void>}
 */
async function checkDataInTask(page: Page, nameValue: string, typeValue: string, priceValue?: string) {
    // Submit the form and wait for the POST (creation) response
    const responsePromise = await interception.interceptions([{
        url: navigationTabUrl,
        method: 'POST',
        statusCode: statusCode.Created
    }], selectors.btnCreateTask, true)

    // Extract the created ID from the API response
    const data = await responsePromise[0].json();
    createdId = data.id;

    // Verify initial checkbox state and click it
    const checkbox = page.locator(`[${universalSelector}="${selectors.taskCheckbox}-${createdId}"]`)
    await expect(checkbox).not.toHaveClass('/Mui-checked/')
    await checkbox.click();
    await expect(checkbox).toHaveClass(/(^|\s)Mui-checked(\s|$)/)

    // Verify task name
    const name = page.locator(`[${universalSelector}="${selectors.taskItem}-${createdId}"] div span`)
    await expect(name).toHaveText(nameValue)

    // Verify task type/price
    const type = page.locator(`[${universalSelector}="${selectors.taskItem}-${createdId}"] p`)
    if (typeValue === Free) {
        await expect(type).toHaveText('free')
    } else {
        // Use RegExp to handle currency formatting if needed (e.g., '₴120.00')
        await expect(type).toHaveText(new RegExp(`₴${priceValue}\\.00`));
    }
}

/**
 * @async
 * @function removeTask
 * @description Clicks the delete button for the globally stored `createdId` and verifies the task is removed from the DOM.
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<void>}
 */
async function removeTask(page: Page) {
    // Click the delete button and wait for the DELETE API response (204 No Content)
    await interception.interceptions([{
        url: navigationTabUrl,
        method: 'DELETE',
        statusCode: statusCode.NoContent
    }], `[data-testid="task-delete-button-${createdId}"]`)

    // Verify the task element is no longer visible
    await expect(page.locator(`[${universalSelector}="${selectors.taskItem}-${createdId}"]`)).toHaveCount(0)
}

/**
 * @description Sets up the Login, Interception, and Navigation objects before each test.
 * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
 */
test.beforeEach(async ({page}) => {
    login = new Login(page);
    interception = new Interception(page)
    navigation = new Navigation(interception);
});

/**
 * @description Test suite for 'Checklist' functionality, covering creation, validation, and deletion of tasks.
 */
test.describe('Checklist', () => {

    /**
     * @description Navigates to the base URL, signs in, and navigates to the 'Checklist' tab before each test in this suite.
     * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
     */
    test.beforeEach(async ({page}) => {
        await page.goto('/');
        await login.signIn(USER, PASSWORD, statusCode.OK);
        // Navigate to the Checklist tab and wait for the initial API load
        await navigation.gotoTabRequests(navigationTabUrl, statusCode.OK, selectors.tabChecklist);
    });

    /**
     * @test Tests the creation and removal of a new task with the 'Free' type.
     * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Creating new task with free amount', async ({page}) => {

        await createTask(page, taskName, Free)
        await checkDataInTask(page, taskName, Free)
        await removeTask(page)
    })

    /**
     * @test Tests the creation and removal of a new task with the 'Paid' type and a specified price.
     * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Creating new task with amount ', async ({page}) => {

        await createTask(page, taskName, Paid, value)
        await checkDataInTask(page, taskName, Paid, value)
        await removeTask(page)
    })

    /**
     * @test Tests the validation message when attempting to create a task without a required name.
     * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
     */
    test('Validation creating task', async ({page}) => {

        // Open form and attempt submission without filling required fields
        await page.locator(selectors.btnAddTask).click()
        await page.locator(selectors.btnCreateTask).click()

        // Verify the expected validation error message
        await expect(page.locator(selectors.allerMessage)).toHaveText('Task name is required.')
    })
})