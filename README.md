# Playwright Test Automation Project

![Test Run Demo](media/demo.gif)

This project contains automated end-to-end tests for a web application, written using [Playwright](https://playwright.dev/).

## Project Structure

```
/
├───.gitignore
├───package.json
├───playwright.config.ts
├───README.md
└───tests/
    ├───integration/
    │   ├───checklist/
    │   │   └───checklist.spec.ts
    │   ├───leaveRequests/
    │   │   └───leaveRequests.spec.ts
    │   └───registration/
    │       └───registration.spec.ts
    └───support/
        ├───interception/
        │   └───interception.ts
        ├───login/
        │   └───login.ts
        └───tabNavigation/
            └───tabNavigation.ts
```

The project follows a structured approach to keep tests organized and maintainable:

- `tests/integration/`: Contains the main test suites, categorized by application feature (e.g., `checklist`, `leaveRequests`, `registration`).
- `tests/support/`: Contains reusable helper classes and utilities that abstract common functionalities:
    - `login/login.ts`: A class to handle user authentication.
    - `interception/interception.ts`: A utility for intercepting and waiting for API requests, making tests more stable.
    - `tabNavigation/tabNavigation.ts`: A class for handling navigation between different parts of the application.
- `playwright.config.ts`: The main configuration file for Playwright, including test settings, reporters, and browser configurations.
- `package.json`: Defines project dependencies and scripts.

## Features Covered

The automated tests cover the following application features:
- **User Authentication**: Sign-in, password reset, and handling of invalid login attempts.
- **Leave Requests**: Creation of sick and vacation leave requests, approving/rejecting requests, and validating statuses.
- **Checklist**: Creation of "Free" and "Paid" tasks, task validation, and the "close month" functionality to carry over tasks.

## How to Run Tests

To run the tests, use the following npm scripts:

- **Run all tests (headless):**
  ```bash
  npm test
  ```

- **Run all tests in headed mode (shows the browser):**
  ```bash
  npm run test:headed
  ```

- **Run a specific test file:**
  ```bash
  npx playwright test tests/integration/leaveRequests/leaveRequests.spec.ts
  ```

- **Run tests that match a specific title (grep):**
  ```bash
  npx playwright test -g "Validation creating task"
  ```

- **View the HTML test report:**
  ```bash
  npm run report
  ```