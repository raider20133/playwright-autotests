import {test as base, Page} from '@playwright/test';
import Interception from '../support/interception/interception';
import Login from '../support/login/login';
import Navigation from '../support/tabNavigation/tabNavigation';

/**
 * @interface MyFixtures
 * @description Defines the structure for the custom Playwright fixtures injected into test functions.
 * These fixtures provide access to application-specific helper classes.
 */
type MyFixtures = {
    /** Custom fixture for handling API request interception and waiting for specific responses. */
    interception: Interception;
    /** Custom fixture for handling user authentication and sign-in operations. */
    login: Login;
    /** Custom fixture for handling navigation across application tabs, often waiting for associated API requests. */
    navigation: Navigation;
};

/**
 * @constant {import('@playwright/test').Test<MyFixtures, {}>} test
 * @description Exports the extended Playwright test object, injecting custom fixtures defined in `MyFixtures`.
 * This setup allows tests to use `interception`, `login`, and `navigation` directly as parameters.
 */
export const test = base.extend<MyFixtures>({
    /**
     * @fixture interception
     * @description Provides an instance of the {@link Interception} class for managing network requests during tests.
     * @param {object} object - The Playwright fixture object.
     * @param {Page} object.page - The Playwright Page object.
     * @param {function(Interception): Promise<void>} use - Callback to yield the fixture value.
     */
    interception: async ({page}: { page: Page }, use) => {
        const interception = new Interception(page);
        await use(interception);
    },

    /**
     * @fixture login
     * @description Provides an instance of the {@link Login} class for handling authentication flows.
     * @param {object} object - The Playwright fixture object.
     * @param {Page} object.page - The Playwright Page object.
     * @param {function(Login): Promise<void>} use - Callback to yield the fixture value.
     */
    login: async ({page}: { page: Page }, use) => {
        const login = new Login(page);
        await use(login);
    },

    /**
     * @fixture navigation
     * @description Provides an instance of the {@link Navigation} class for managing UI navigation.
     * It requires the `interception` fixture to handle API calls associated with tab switching.
     * @param {object} object - The Playwright fixture object.
     * @param {Interception} object.interception - The Interception fixture instance.
     * @param {function(Navigation): Promise<void>} use - Callback to yield the fixture value.
     */
    navigation: async ({interception}: { interception: Interception }, use) => {
        const navigation = new Navigation(interception);
        await use(navigation);
    }
});

/**
 * @constant {import('@playwright/test').Expect} expect
 * @description Re-exports the Playwright `expect` function for standard assertions.
 */
export const expect = test.expect;