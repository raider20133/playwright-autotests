import {test, expect, Page} from '@playwright/test'
import Login from "../../support/login/login";

const username: string = 'Playwright'
const password: string = 'Playwright'

interface TypeRequest {
    sick: string,
    vacation: string
}

interface StatusType {
    pending: string,
    approved: string,
    reject: string
}

const statusType: StatusType = {
    pending: 'pending',
    approved: 'approved',
    reject: 'rejected'
}

const typeRequest: TypeRequest = {
    sick: 'Sick',
    vacation: 'Vacation'
}

let login: Login;

test.beforeEach(async ({page}) => {
    login = new Login(page);
});

async function gotoTabRequests(page: Page) {
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'GET' &&
            resp.status() === 200
        ),
        await page.locator('li:has(span:text("Leave Requests")) >> role=button').click()
    ]);
}

async function chooseTypeOfRequest(page: Page, selector: string) {
    await page.locator('[aria-labelledby="leave-type-label"]').click()
    await page.locator(`role=option[name="${selector}"]`).click();
    const today: string = new Date().toISOString().split('T')[0];
    const startDateInput = page.locator('label:text("Start Date") >> xpath=.. >> input[type="date"]');
    const endDateInput = page.locator('label:text("End Date") >> xpath=.. >> input[type="date"]');
    await startDateInput.fill(today);
    await endDateInput.fill(today);
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'POST' &&
            resp.status() === 201
        ),
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'GET' &&
            resp.status() === 200
        ),
        await page.locator('button:text("SUBMIT")').click()
    ]);
}

async function clickButtonStatus(page: Page, button: string) {
    await Promise.all([
        page.waitForResponse(resp =>
            resp.url().includes('/api/leave') &&
            resp.request().method() === 'PUT' &&
            resp.status() === 200
        ),
        await page.locator(`button:text("${button}")`).last().click()
    ])
}

async function getCardData(page: Page, index: number = 0) {
    const cardsCount: number = await page.locator('div.MuiCard-root').count();
    if (index < 0) index = cardsCount - 1;
    const card = page.locator('div.MuiCard-root').nth(index);
    const type: string = (await card.locator('.MuiTypography-subtitle1').textContent())?.trim() || '';
    const status: string = (await card.locator('.MuiChip-label').textContent())?.trim() || '';
    return {type, status};
}

async function reCheckStatus(typeCard: string, typeStatus: string, requestType: string, status: string) {
    expect(typeCard.toLowerCase()).toBe(requestType.toLowerCase());
    expect(typeStatus.toLowerCase()).toBe(status.toLowerCase());
}

test('Leave Requests - type Sick', async ({page}) => {
    await page.goto('/')
    await login
        .signIn(username, password)
    await gotoTabRequests(page)
    await chooseTypeOfRequest(page, 'Sick Leave')

    const firstCard: { type: string, status: string } = await getCardData(page);
    await reCheckStatus(firstCard.type, firstCard.status, typeRequest.sick, statusType.pending)
    await clickButtonStatus(page, 'APPROVE')

    const lastCard: { type: string, status: string } = await getCardData(page, -1);
    await reCheckStatus(lastCard.type, lastCard.status, typeRequest.sick, statusType.approved)
})

test('Leave Request - type Vacation', async ({page}) => {
    await page.goto('/')
    await login
        .signIn(username, password)
    await gotoTabRequests(page)
    await chooseTypeOfRequest(page, 'Vacation')

    const firstCard: { type: string, status: string } = await getCardData(page);
    await reCheckStatus(firstCard.type, firstCard.status, typeRequest.vacation, statusType.pending)
    await clickButtonStatus(page, 'APPROVE')

    const lastCard: { type: string, status: string } = await getCardData(page, -1);
    await reCheckStatus(lastCard.type, lastCard.status, typeRequest.vacation, statusType.approved)
})