import {test, expect} from '../../fixtures/fixtures';
// Importing USER, and PASSWORD from Playwright config for direct API calls.
import {USER, PASSWORD} from "../../../playwright.config";

/**
 * @enum {string} selectors
 * @description Enumeration of data-testid selectors and other specific CSS selectors used in the Leave Requests page.
 */
enum selectors {
    /** Data-testid for the button used to approve a leave request. */
    approveButton = 'approve-button',
    /** Data-testid for the button used to reject a leave request. */
    rejectButton = 'reject-button',
    /** Selector for the dropdown/select input used to choose the type of leave request. */
    requestType = '[aria-labelledby="leave-type-label"]',
    /** Input field for the start date of the leave request. */
    startDate = 'label:text("Start Date") >> xpath=.. >> input[type="date"]',
    /** Input field for the end date of the leave request. */
    endDate = 'label:text("End Date") >> xpath=.. >> input[type="date"]',
    /** Button used to submit the leave request form. */
    submitButton = '[data-testid="leave-request-submit-button"]',
    /** Selector for the message area of a standard UI alert (e.g., validation message). */
    alertMessage = '.MuiAlert-message',
    /** Button to delete all existing leave requests. */
    deletingAllButton = '[data-testid="delete-all-button"]',
    /** Selector for the desktop navigation tab leading to Leave Requests. */
    tabLeaveRequest = '[data-testid="menu-item-leave-desktop"]',
    /** Message displayed when no leave requests are found. */
    emptyMessage = '[data-testid="no-leave-requests-found"]',
    /** Base data-testid for the element displaying the status of a leave request, typically appended with an ID. */
    requestStatus = 'leave-request-status',
    /** Base data-testid for the element displaying the type/name of a leave request, typically appended with an ID. */
    requestName = 'leave-request-type',
    /** Base data-testid for the element displaying the start and end dates of the leave request, typically appended with an ID. */
    requestDate = 'leave-request-dates'
}

/**
 * @type {number}
 * @description The expected HTTP status code for successful API calls (e.g., login, reset, updates).
 * */
const statusCode: number = 200;

/**
 * @type {string}
 * @description The API endpoint URL used for navigating to the leave request tab and managing requests (GET, POST, PUT, DELETE).
 */
const navigationTabUrl: string = '/api/leave'

/**
 * @interface TypeRequest
 * @description Defines the keys and their expected display names for different types of leave requests.
 */
interface TypeRequest {
    /** The display name for a sick leave request. */
    sick: string,
    /** The display name for a vacation request. */
    vacation: string
}

/**
 * @interface StatusType
 * @description Defines the keys and their expected string values for different leave request statuses.
 */
interface StatusType {
    /** The string value for a pending status. */
    pending: string,
    /** The string value for an approved status. */
    approved: string,
    /** The string value for a rejected status. */
    rejected: string
}

/**
 * @interface LeaveRequest
 * @description Structure for the response object of a leave request from the API (used for type hint, actual response might differ slightly).
 */
interface LeaveRequest {
    /** Unique identifier of the leave request. */
    id: string;
    /** Identifier for the user who made the request. */
    user: string;
    /** Date of the request creation. */
    date: string;
}

/**
 * @constant {StatusType} statusType
 * @description Maps status keys to their expected string values (lowercase) used for assertions.
 */
const statusType: StatusType = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected'
}

/**
 * @constant {TypeRequest} typeRequest
 * @description Maps request type keys to their expected display names ('Sick', 'Vacation').
 */
const typeRequest: TypeRequest = {
    sick: 'Sick',
    vacation: 'Vacation'
}

/**
 * @type {string}
 * @description The attribute name used for locating elements, typically 'data-testid' in this context.
 */
let selector: string = 'data-testid'

/**
 * @type {number}
 * @description The ID of the most recently created leave request, retrieved from the POST response payload.
 */
let createdId: number

/**
 * @async
 * @function chooseTypeOfRequest
 * @description Selects a type of leave request, fills in today's date for start/end, submits the request, and retrieves the new request's ID.
 * @param {object} object - The Playwright fixture object.
 * @param {import('@playwright/test').Page} object.page - The Playwright Page object.
 * @param {any} object.interception - The custom interception fixture function.
 * @param {string} selector - The visible text of the leave type to select (e.g., 'Sick Leave', 'Vacation').
 * @returns {Promise<string>} The ISO date string for "today" that was used for start/end date fields.
 */
async function chooseTypeOfRequest({page, interception}, selector: string): Promise<string> {
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
 * @description Clicks the specified action button for the globally stored `createdId` and verifies the updated status after the PUT API call.
 * @param {object} object - The Playwright fixture object.
 * @param {import('@playwright/test').Page} object.page - The Playwright Page object.
 * @param {any} object.interception - The custom interception fixture function.
 * @param {string} buttonSelector - The base data-testid selector ID of the button to click (e.g., 'approve-button', 'reject-button').
 * @param {string} status - The expected final status text of the request (e.g., 'approved', 'rejected').
 * @returns {Promise<void>}
 */
async function clickButtonStatus({page, interception}, buttonSelector: string, status: string) {
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

    // Locate the status chip for the request and assert its text content. Case-insensitive check.
    const statusLocator = page.locator(`[${selector}="${selectors.requestStatus}-${createdId}"]`);
    await expect(statusLocator).toHaveText(new RegExp(status, 'i'));
}

/**
 * @async
 * @function getCardData
 * @description Retrieves the type, status, and dates from the leave request card corresponding to the globally stored `createdId`.
 * @param {object} object - The Playwright fixture object.
 * @param {import('@playwright/test').Page} object.page - The Playwright Page object.
 * @returns {Promise<{type: string, status: string, dates: string}>} An object containing the request type, status, and dates.
 */
async function getCardData({page}) {
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
 * @description Performs assertions to verify the request type and status match the expected values (case-insensitive).
 * @param {string} actualType - The actual type text retrieved from the card.
 * @param {string} actualStatus - The actual status text retrieved from the card.
 * @param {string} expectedType - The expected request type (e.g., 'Sick', 'Vacation').
 * @param {string} expectedStatus - The expected status (e.g., 'pending', 'approved').
 * @returns {Promise<void>}
 */
async function reCheckStatus(actualType: string, actualStatus: string, expectedType: string, expectedStatus: string) {
    expect(actualType.toLowerCase()).toBe(expectedType.toLowerCase());
    expect(actualStatus.toLowerCase()).toBe(expectedStatus.toLowerCase());
}

/**
 * @constant {Array<Object>} scenarios
 * @description An array of test scenarios for creating a request and then approving/rejecting it, covering Sick and Vacation leave types.
 * @property {string} leaveType - The display name of the leave type for selection in the UI.
 * @property {string} typeKey - The key corresponding to the type in `typeRequest`.
 * @property {string} action - The data-testid selector base for the button to click (e.g., 'approve-button').
 * @property {string} expectedStatus - The key corresponding to the final expected status in `statusType`.
 */
const scenarios = [
    {leaveType: 'Sick Leave', typeKey: 'sick', action: selectors.approveButton, expectedStatus: 'approved'},
    {leaveType: 'Vacation', typeKey: 'vacation', action: selectors.approveButton, expectedStatus: 'approved'},
    {leaveType: 'Sick Leave', typeKey: 'sick', action: selectors.rejectButton, expectedStatus: 'rejected'},
    {leaveType: 'Vacation', typeKey: 'vacation', action: selectors.rejectButton, expectedStatus: 'rejected'},
];

/**
 * @description Test suite for 'Leave Requests' functionality, focusing on creation, status updates (Approve/Reject), and validation.
 */
test.describe('@smoke Leave Requests', () => {

    /**
     * @description Navigates to the base URL, signs in, and navigates to the 'Leave Requests' tab before each test in this suite.
     * @param {{page: import('@playwright/test').Page, login: any, navigation: any}} object - The Playwright test fixture object containing the page, login, and navigation objects.
     */
    test.beforeEach(async ({page, login, navigation}) => {
        await page.goto('/');
        await login.signIn(USER, PASSWORD, statusCode);
        // Use the Navigation class to go to the tab and wait for the initial API load
        await navigation.gotoTabRequests(navigationTabUrl, statusCode, selectors.tabLeaveRequest);
    });

    /**
     * @description Generates and runs tests for each scenario: Create a request, check initial status, perform the action (Approve/Reject), and verify the final status.
     * @param {object} scenario - Destructured object containing test parameters: `leaveType`, `typeKey`, `action`, `expectedStatus`.
     */
    for (const {leaveType, typeKey, action, expectedStatus} of scenarios) {
        test(`${leaveType} request - ${action}`, async ({page, interception}) => {

            // 1. Create a new request. The function returns the date used and stores the new ID in `createdId`.
            const today: string = await chooseTypeOfRequest({page, interception}, leaveType);

            // 2. Verify the newly created request is initially pending, and check the dates.
            const firstCard: { type: string, status: string, dates: string } = await getCardData({page});
            // Initial status must be pending
            await reCheckStatus(firstCard.type, firstCard.status, typeRequest[typeKey], statusType.pending);

            // Check the displayed date format (assuming 'en-US' locale for date formatting as an example)
            const formattedDate: string = new Date(today).toLocaleDateString('en-US');
            expect(firstCard.dates).toBe(`${formattedDate} - ${formattedDate}`);

            // 3. Perform the action (APPROVE/REJECT) and verify its updated status using the stored ID.
            await clickButtonStatus({page, interception}, action, statusType[expectedStatus]);

            // 4. Verify the final status of the request after the action using the stored ID.
            const lastCard: { type: string, status: string, dates: string } = await getCardData({page});
            await reCheckStatus(lastCard.type, lastCard.status, typeRequest[typeKey], statusType[expectedStatus]);
        });
    }

    /**
     * @test Tests the error handling when attempting to submit a request without selecting required date fields.
     */
    test('Incorrect data validation (Missing Dates)', async ({page}) => {

        // Attempt to submit without filling date inputs.
        await page.locator(selectors.submitButton).click()
        // Verify the expected error message is displayed.
        await expect(page.locator(selectors.alertMessage)).toHaveText('Please select both start and end dates.');
    })

    /**
     * @test Tests the functionality to delete all existing leave requests and verifies the resulting empty state message.
     */
    test('Deleting all requests', async ({page}) => {
        // Automatically accept the confirmation dialog (e.g., a modal asking "Are you sure?") when it appears
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