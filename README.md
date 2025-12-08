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

## CI/CD and Reporting

This project uses GitHub Actions for Continuous Integration and Allure for detailed test reporting.

### GitHub Actions Workflow

A GitHub Actions workflow is configured in `.github/workflows/daily-tests.yml` to automate test execution. This workflow has the following features:

- **Daily Execution**: Tests are automatically run every day at 06:00 UTC.
- **Manual Trigger**: You can also trigger the workflow manually from the Actions tab in the GitHub repository.
- **Allure Report Generation**: After the tests run, an Allure report is generated.
- **Deployment to GitHub Pages**: The generated Allure report is automatically deployed to GitHub Pages, providing a live dashboard of the test results.

### Allure Test Report

The Allure Framework is used to create detailed and interactive test reports. These reports provide a clear overview of the test results, including:

-   A detailed breakdown of test statuses (passed, failed, skipped).
-   Historical trends of test runs.
-   Screenshots and other artifacts for failed tests.

The link to the latest Allure report is dynamically generated for each run and sent via Telegram notification.

### Telegram Notifications

After each workflow run, a notification is automatically sent to a designated Telegram chat. This provides an immediate summary of the test results.

The notification includes:
- **Test Summary**: A quick overview of the number of passed, failed, and skipped tests.
- **Timestamp**: The start time of the test run.
- **Link to Allure Report**: A unique, direct link to the full Allure report for that specific run, hosted on GitHub Pages.

#### Configuration

To enable Telegram notifications, you need to configure the following secrets in your GitHub repository's settings (`Settings > Secrets and variables > Actions`):

-   `TELEGRAM_TOKEN`: The authentication token for your Telegram bot.
-   `TELEGRAM_CHAT_ID`: The unique identifier for the target chat where notifications will be sent.