import {test, expect, Page} from '@playwright/test'
// Assuming the Login class is for handling user sign-in.
import Login from "../../support/login/login";

/**
 * @type {string}
 * @description The username used for testing.
 */
const username: string = 'Playwright'

/**
 * @type {string}
 * @description The password used for testing.
 */
const password: string = 'Playwright'

/**
 * @type {number}
 * @description The expected HTTP status code for successful API calls (e.g., login, reset).
 * */
const statusCode: number = 200;

/**
 * @interface TypeRequest
 * @description Defines the keys for different types of leave requests.
 */
interface TypeRequest {
    /** The key for a sick leave request. */
    sick: string,
    /** The key for a vacation request. */
    vacation: string
}

/**
 * @interface StatusType
 * @description Defines the keys for different leave request statuses.
 */
interface StatusType {
    /** The key for a pending status. */
    pending: string,
    /** The key for an approved status. */
    approved: string,
    /** The key for a rejected status. */
    rejected: string
}

/**
 * @constant {StatusType} statusType
 * @description Maps status keys to their expected string values.
 */
const statusType: StatusType = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected'
}

/**
 * @constant {TypeRequest} typeRequest
 * @description Maps request type keys to their expected display names.
 */
const typeRequest: TypeRequest = {
    sick: 'Sick',
    vacation: 'Vacation'
}

/**
 * @type {Login}
 * @description An instance of the Login class to handle sign-in operations.
 */
let login: Login;

/**
 * @description Sets up the Login object before each test.
 * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
 */
test.beforeEach(async ({page}) => {
    login = new Login(page);
});

/**
 * @async
 * @function gotoTabRequests
 * @description Navigates to the 'Leave Requests' tab and waits for the API response.
 * @param {Page} page - The Playwright Page object.
 */
async function gotoTabRequests(page: Page) {
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'GET' &&
            resp.status() === statusCode
        ),
        await page.locator('li:has(span:text("Leave Requests")) >> role=button').click()
    ]);
}

/**
 * @async
 * @function chooseTypeOfRequest
 * @description Selects a type of leave request, fills in today's date for start/end, and submits the request.
 * @param {Page} page - The Playwright Page object.
 * @param {string} selector - The visible text of the leave type to select (e.g., 'Sick Leave', 'Vacation').
 */
async function chooseTypeOfRequest(page: Page, selector: string) {
    await page.locator('[aria-labelledby="leave-type-label"]').click()
    await page.locator(`role=option[name="${selector}"]`).click();

    // Set today's date for Start Date and End Date inputs
    const today: string = new Date().toISOString().split('T')[0];
    const startDateInput = page.locator('label:text("Start Date") >> xpath=.. >> input[type="date"]');
    const endDateInput = page.locator('label:text("End Date") >> xpath=.. >> input[type="date"]');
    await startDateInput.fill(today);
    await endDateInput.fill(today);

    // Submit the request and wait for both the POST (creation) and GET (refresh) API responses
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'POST' &&
            resp.status() === 201
        ),
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'GET' &&
            resp.status() === statusCode
        ),
        await page.locator('button:text("SUBMIT")').click()
    ]);
}

/**
 * @async
 * @function clickButtonStatus
 * @description Clicks the specified action button on the last request card and verifies the updated status.
 * @param {Page} page - The Playwright Page object.
 * @param {string} button - The text of the button to click (e.g., 'APPROVE', 'REJECT').
 * @param {string} status - The expected final status text of the request.
 */
async function clickButtonStatus(page: Page, button: string, status: string) {
    // Wait for the PUT (update status) API response and click the last button with the specified text
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'PUT' &&
            resp.status() === statusCode
        ),
        await page.locator(`button:text("${button}")`).last().click()
    ])
    // Locate the status chip on the last card and assert its text content.
    const lastCardLocator = page.locator('div.MuiCard-root').last().locator('.MuiChip-label');
    await expect(lastCardLocator).toHaveText(status, {timeout: 5000});
}

/**
 * @async
 * @function getCardData
 * @description Retrieves the type and status from a leave request card.
 * @param {Page} page - The Playwright Page object.
 * @param {number} [index=0] - The index of the card to retrieve (0 is the first, -1 is the last).
 * @returns {Promise<{type: string, status: string}>} An object containing the request type and status.
 */
async function getCardData(page: Page, index: number = 0) {
    const cardsCount: number = await page.locator('div.MuiCard-root').count();
    // If index is negative, treat it as the last card.
    if (index < 0) index = cardsCount - 1;

    // A small wait might be needed to ensure the card elements are fully stable.
    await page.waitForTimeout(2000);

    const card = page.locator('div.MuiCard-root').nth(index);
    // Retrieve and trim the text content for type and status.
    const type: string = (await card.locator('.MuiTypography-subtitle1').textContent())?.trim() || '';
    const status: string = (await card.locator('.MuiChip-label').textContent())?.trim() || '';
    return {type, status};
}

/**
 * @async
 * @function reCheckStatus
 * @description Performs assertions to verify the request type and status.
 * @param {string} typeCard - The actual type text retrieved from the card.
 * @param {string} typeStatus - The actual status text retrieved from the card.
 * @param {string} requestType - The expected request type (e.g., 'Sick', 'Vacation').
 * @param {string} status - The expected status (e.g., 'pending', 'approved').
 */
async function reCheckStatus(typeCard: string, typeStatus: string, requestType: string, status: string) {
    expect(typeCard.toLowerCase()).toBe(requestType.toLowerCase());
    expect(typeStatus.toLowerCase()).toBe(status.toLowerCase());
}

/**
 * @constant {Array<Object>} scenarios
 * @description An array of test scenarios for creating a request and then approving/rejecting it.
 * @property {string} leaveType - The display name of the leave type for selection.
 * @property {string} typeKey - The key corresponding to the type in `typeRequest`.
 * @property {string} action - The button text to click (e.g., 'APPROVE', 'REJECT').
 * @property {string} expectedStatus - The key corresponding to the final expected status in `statusType`.
 */
const scenarios = [
    {leaveType: 'Sick Leave', typeKey: 'sick', action: 'APPROVE', expectedStatus: 'approved'},
    {leaveType: 'Vacation', typeKey: 'vacation', action: 'APPROVE', expectedStatus: 'approved'},
    {leaveType: 'Sick Leave', typeKey: 'sick', action: 'REJECT', expectedStatus: 'rejected'},
    {leaveType: 'Vacation', typeKey: 'vacation', action: 'REJECT', expectedStatus: 'rejected'},
];

/**
 * @description Test suite for 'Leave Requests' functionality.
 */
test.describe('Leave Requests', () => {
    /**
     * @description Navigates to the base URL, signs in, and navigates to the 'Leave Requests' tab before each test in this suite.
     * @param {{page: Page}} object - The Playwright test fixture object containing the page object.
     */
    test.beforeEach(async ({page}) => {
        await page.goto('/');
        await login.signIn(username, password, statusCode);
        await gotoTabRequests(page);
    });

    /**
     * @description Generates and runs tests for each scenario defined in the `scenarios` array.
     */
    for (const {leaveType, typeKey, action, expectedStatus} of scenarios) {
        test(`${leaveType} request - ${action}`, async ({page}) => {
            // 1. Create a new request.
            await chooseTypeOfRequest(page, leaveType);

            // 2. Verify the newly created request (first card) is pending.
            const firstCard = await getCardData(page);
            await reCheckStatus(firstCard.type, firstCard.status, typeRequest[typeKey], statusType.pending);

            // 3. Perform the action (APPROVE/REJECT) on the request and verify its status update.
            await clickButtonStatus(page, action, statusType[expectedStatus]);

            // 4. Verify the status of the request (now the last card) after the action.
            const lastCard = await getCardData(page, -1);
            await reCheckStatus(lastCard.type, lastCard.status, typeRequest[typeKey], statusType[expectedStatus]);
        });
    }

    /**
     * @description Tests the error handling when submitting a request without selecting required data.
     */
    test('Incorrect data', async ({page}) => {
        // Attempt to submit without selecting a type or dates.
        await page.locator('button:text("SUBMIT")').click()
        // Verify the expected error message is displayed.
        await expect(page.locator('.MuiAlert-message')).toHaveText('Please select both start and end dates.');
    })
})