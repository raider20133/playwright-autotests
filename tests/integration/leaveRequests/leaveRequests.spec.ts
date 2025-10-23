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
 * @description Enumeration of data-testid selectors and other specific CSS selectors used in the Leave Requests page.
 */
enum selectors {
    approveButton = 'approve-button',
    rejectButton = 'reject-button',
    requestType = '[aria-labelledby="leave-type-label"]',
    startDate = 'label:text("Start Date") >> xpath=.. >> input[type="date"]',
    endDate = 'label:text("End Date") >> xpath=.. >> input[type="date"]',
    submitButton = '[data-testid="leave-request-submit-button"]',
    alertMessage = '.MuiAlert-message',
    deletingAllButton = '[data-testid="delete-all-button"]',
    tabLeaveRequest = '[data-testid="menu-item-leave-desktop"]',
    emptyMessage = '[data-testid="no-leave-requests-found"]',
    requestStatus = 'leave-request-status',
    requestName = 'leave-request-type',
    /** @description Data-testid for the element displaying the start and end dates of the leave request. */
    requestDate = 'leave-request-dates'
}

/**
 * @type {number}
 * @description The expected HTTP status code for successful API calls (e.g., login, reset).
 * */
const statusCode: number = 200;

/**
 * @type {string}
 * @description The API endpoint URL used for navigating to the leave request tab and managing requests.
 */
const navigationTabUrl: string = '/api/leave'

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
 * @interface LeaveRequest
 * @description Structure for the response object of a leave request from the API.
 */
interface LeaveRequest {
    /** Unique identifier of the leave request. */
    id: string;
    /** Identifier for the user who made the request. */
    user: string;
    /** Date of the request. */
    date: string;
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
 * @type {string}
 * @description The attribute used for locating elements, typically 'data-testid' in this context.
 */
let selector: string = 'data-testid'

/**
 * @type {number}
 * @description The ID of the most recently created leave request, retrieved from the POST response.
 */
let createdId: number

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
 * @async
 * @function chooseTypeOfRequest
 * @description Selects a type of leave request, fills in today's date for start/end, submits the request, and retrieves the new request's ID.
 * @param {Page} page - The Playwright Page object.
 * @param {string} selector - The visible text of the leave type to select (e.g., 'Sick Leave', 'Vacation').
 * @returns {Promise<string>} The ISO date string for "today" that was used for start/end date fields.
 */
async function chooseTypeOfRequest(page: Page, selector: string): Promise<string> {
    await page.locator(selectors.requestType).click()
    await page.locator(`role=option[name="${selector}"]`).click();

    // Set today's date for Start Date and End Date inputs
    const today: string = new Date().toISOString().split('T')[0];
    const startDateInput = page.locator(selectors.startDate);
    const endDateInput = page.locator(selectors.endDate);
    await startDateInput.fill(today);
    await endDateInput.fill(today);

    // Submit the request and wait for POST (creation) and GET (refresh) responses
    const responses = await interception.interceptions([
        {url: navigationTabUrl, method: 'POST', statusCode: 201},
        {url: navigationTabUrl, method: 'GET', statusCode: 200}
    ], selectors.submitButton, true); // true to return responses

    // Extract the ID from the POST response payload
    const postResponse = responses[0];
    const data = await postResponse.json();

    createdId = data.leaveId; // Store the new ID globally for subsequent checks

    return today;
}


/**
 * @async
 * @function clickButtonStatus
 * @description Clicks the specified action button for the globally stored `createdId` and verifies the updated status.
 * @param {Page} page - The Playwright Page object.
 * @param {string} buttonSelector - The selector ID of the button to click (e.g., 'approve-button', 'reject-button').
 * @param {string} status - The expected final status text of the request.
 * @returns {Promise<void>}
 */
async function clickButtonStatus(page: Page, buttonSelector: string, status: string) {
    // Construct the full selector using the generic attribute and the stored request ID
    const finalSelector = `[${selector}="${buttonSelector}-${createdId}"]`;

    // Wait for the PUT (update status) API response and click the specific button
    await interception.interceptions(
        [{
            url: navigationTabUrl,
            method: 'PUT',
            statusCode: statusCode
        }],
        // Click the specific button associated with the request ID.
        finalSelector
    );

    // Locate the status chip for the request and assert its text content.
    const statusLocator = page.locator(`[${selector}="${selectors.requestStatus}-${createdId}"]`);
    await expect(statusLocator).toHaveText(status);
}

/**
 * @async
 * @function getCardData
 * @description Retrieves the type, status, and dates from the leave request card corresponding to the globally stored `createdId`.
 * @param {Page} page - The Playwright Page object.
 * @returns {Promise<{type: string, status: string, dates: string}>} An object containing the request type, status, and dates.
 */
async function getCardData(page: Page) {
    await page.waitForTimeout(1000); // Give the UI a moment to render

    // Retrieve and trim the text content for type, status, and dates using the stored request ID.
    const typeLocator = page.locator(`[${selector}="${selectors.requestName}-${createdId}"]`);
    const statusLocator = page.locator(`[${selector}="${selectors.requestStatus}-${createdId}"]`);
    const datesLocator = page.locator(`[${selector}="${selectors.requestDate}-${createdId}"]`);

    const type: string = (await typeLocator.textContent())?.trim() || '';
    const status: string = (await statusLocator.textContent())?.trim() || '';
    const dates: string = (await datesLocator.textContent())?.trim() || '';

    return {type, status, dates};
}

/**
 * @async
 * @function reCheckStatus
 * @description Performs assertions to verify the request type and status.
 * @param {string} typeCard - The actual type text retrieved from the card.
 * @param {string} typeStatus - The actual status text retrieved from the card.
 * @param {string} requestType - The expected request type (e.g., 'Sick', 'Vacation').
 * @param {string} status - The expected status (e.g., 'pending', 'approved').
 * @returns {Promise<void>}
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
 * @property {string} action - The data-testid selector for the button to click (e.g., 'approve-button').
 * @property {string} expectedStatus - The key corresponding to the final expected status in `statusType`.
 */
const scenarios = [
    {leaveType: 'Sick Leave', typeKey: 'sick', action: selectors.approveButton, expectedStatus: 'approved'},
    {leaveType: 'Vacation', typeKey: 'vacation', action: selectors.approveButton, expectedStatus: 'approved'},
    {leaveType: 'Sick Leave', typeKey: 'sick', action: selectors.rejectButton, expectedStatus: 'rejected'},
    {leaveType: 'Vacation', typeKey: 'vacation', action: selectors.rejectButton, expectedStatus: 'rejected'},
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
        await login.signIn(USER, PASSWORD, statusCode);
        // Use the Navigation class to go to the tab
        await navigation.gotoTabRequests(navigationTabUrl, statusCode, selectors.tabLeaveRequest);
    });

    /**
     * @description Generates and runs tests for each scenario: Create a request, find its ID, and approve/reject it.
     */
    for (const {leaveType, typeKey, action, expectedStatus} of scenarios) {
        test(`${leaveType} request - ${action}`, async ({page}) => {

            // 1. Create a new request. The function returns the date used and stores the new ID in `createdId`.
            const today: string = await chooseTypeOfRequest(page, leaveType);

            // 2. Verify the newly created request is initially pending, and check the dates.
            const firstCard: { type: string, status: string, dates: string } = await getCardData(page);
            await reCheckStatus(firstCard.type, firstCard.status, typeRequest[typeKey], statusType.pending);

            // Check the displayed date format (assuming 'en-US' locale for date formatting)
            const formattedDate: string = new Date(today).toLocaleDateString('en-US');
            expect(firstCard.dates).toBe(`${formattedDate} - ${formattedDate}`);

            // 3. Perform the action (APPROVE/REJECT) and verify its updated status using the stored ID.
            await clickButtonStatus(page, action, statusType[expectedStatus]);

            // 4. Verify the final status of the request after the action using the stored ID.
            const lastCard: { type: string, status: string, dates: string } = await getCardData(page);
            await reCheckStatus(lastCard.type, lastCard.status, typeRequest[typeKey], statusType[expectedStatus]);
        });
    }

    /**
     * @test Tests the error handling when submitting a request without selecting required data.
     */
    test('Incorrect data', async ({page}) => {
        // Attempt to submit without selecting a type or dates.
        await page.locator(selectors.submitButton).click()
        // Verify the expected error message is displayed.
        await expect(page.locator(selectors.alertMessage)).toHaveText('Please select both start and end dates.');
    })

    /**
     * @test Tests the functionality to delete all existing leave requests.
     */
    test('Deleting all requests', async ({page}) => {
        // Automatically accept the confirmation dialog when it appears
        page.once('dialog', async dialog => {
            await dialog.accept();
        });

        // Click the delete all button
        await page.locator(selectors.deletingAllButton).click();

        // Verify that the 'No leave requests found.' message is visible
        await expect(page.locator(selectors.emptyMessage))
            .toHaveText('No leave requests found.');
    })
})