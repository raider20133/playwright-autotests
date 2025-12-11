import {Browser, chromium, Page} from '@playwright/test';
import Login from '../login/login';
import Navigation from '../tabNavigation/tabNavigation';
import Interception from '../interception/interception';
import {PASSWORD, USER, baseURL} from '../../../playwright.config';

/**
 * @enum {string} selectors
 * @description Enumeration of data-testid selectors used in the Checklist page, specifically for the cleanup process.
 */
enum selectors {
    /** Selector for the desktop navigation tab for the Checklist. */
    tabChecklist = '[data-testid="menu-item-checklist-desktop"]',
    /** Button to navigate to the next month view. */
    btnNextMonth = '[data-testid="next-month-button"]',
    /** Container for the list of tasks. */
    taskBlock = '[data-testid="tasks-list"]',
    /**List of task in container */
    taskList = '[data-testid="tasks-list"] li'
}

/**
 * @constant {number} statusCode
 * @description The expected HTTP status code for successful GET and POST API calls (e.g., login, navigation).
 */
const statusCode = 200;

/**
 * @constant {string} navigationTabUrl
 * @description The API endpoint URL used for navigating to the tasks tab and managing tasks.
 */
const navigationTabUrl = '/api/tasks';

/**
 * @async
 * @function globalTeardown
 * @description Performs global cleanup after all Playwright tests have run. This function logs in,
 * navigates to the Checklist for the next month (where carried-over tasks are stored), and systematically
 * deletes all visible tasks to ensure a clean state for subsequent test runs.
 * @returns {Promise<void>}
 */
export default async function globalTeardown() {
    console.log('--- Starting global teardown ---');
    let browser: Browser;
    let page: Page;
    try {
        // 1. Setup Playwright browser and page
        browser = await chromium.launch({headless: true});
        page = await browser.newPage();

        await page.context().tracing.start({screenshots: true, snapshots: true, sources: true});

        // 2. Instantiate helper classes
        const login = new Login(page);
        const interception = new Interception(page);
        const navigation = new Navigation(interception);

        // 3. Authenticate and Navigate
        await page.goto(baseURL);
        await login.signIn(USER, PASSWORD, statusCode);

        // Navigate to the Checklist tab and wait for the initial API load
        await navigation.gotoTabRequests(navigationTabUrl, statusCode, selectors.tabChecklist);

        // 4. Navigate to the next month to target carried-over tasks
        await page.locator(selectors.btnNextMonth).click();
        await page.locator(selectors.taskBlock).isVisible()
        // Wait for at least one task item (li) to appear in the list, or timeout if empty.
        await page.waitForSelector(selectors.taskList, {
            timeout: 5000
        });

        // 5. Delete all tasks iteratively
        const taskButtonsLocator = page.locator('[data-testid^="task-delete-button-"]');
        const initialCount = await taskButtonsLocator.count();
        console.log(`Found ${initialCount} tasks to delete.`);

        for (let i = 0; i < initialCount; i++) {

            // Always select the first button in the list, as deletion re-indexes the list
            const firstButton = taskButtonsLocator.first();
            const testId = await firstButton.getAttribute('data-testid');

            if (!testId) {
                console.error("Could not get data-testid for a button. Stopping deletions.");
                break;
            }

            const uniqueSelector = `[data-testid="${testId}"]`;

            // Click the delete button and wait for the successful DELETE API response (204 No Content)
            await interception.interceptions(
                [{url: '/api/tasks', method: 'DELETE', statusCode: 204}],
                uniqueSelector,
                true
            );

            console.log(`Task with ${testId} should be deleted.`);
            // Small pause to prevent potential race conditions with DOM updates
            await page.waitForTimeout(500);
        }

        // 6. Stop tracing
        await page.context().tracing.stop({path: 'teardown_trace.zip'});

    } catch (error) {
        console.error('Error in global teardown:', error);
        if (page) {
            console.log('Stopping trace on error...');
            await page.context().tracing.stop({path: 'teardown_trace_error.zip'});
        }
    } finally {
        // 7. Close browser instance
        if (browser) {
            await browser.close();
        }
        console.log('--- Global teardown finished ---');
    }
}