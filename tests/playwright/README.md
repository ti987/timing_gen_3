# Timing Gen 3 - Playwright Tests

This directory contains end-to-end tests for the Timing Gen 3 application using Playwright.

## Prerequisites

- **Node.js**: Version 18 or higher
- **Python 3**: For running the local web server
- **npm**: Comes with Node.js

## Installation

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

   Or install specific browsers:
   ```bash
   npx playwright install chromium firefox webkit
   ```

## Running Tests

### Run all tests (headless mode)
```bash
npm test
```

### Run tests with browser UI visible (headed mode)
```bash
npm run test:headed
```

### Run tests in debug mode (step through tests)
```bash
npm run test:debug
```

### Run tests with Playwright UI (interactive mode)
```bash
npm run test:ui
```

### Run tests on specific browsers
```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### View test report
After running tests, view the HTML report:
```bash
npm run test:report
```

## Test Structure

### Test Files
- `tests/playwright/timing-gen.spec.js` - Main test suite

### Configuration
- `playwright.config.js` - Playwright configuration
- `package.json` - npm dependencies and scripts

## Test Coverage

The test suite covers:

1. **Application Loading**
   - Verifies the application loads successfully
   - Checks all main UI elements are present

2. **Help Menu & About Dialog**
   - Tests Help menu functionality
   - Verifies About dialog shows version 3.2.1

3. **Signal Management**
   - Adding clock signals
   - Adding bus signals
   - Setting bus values

4. **Drag and Drop**
   - Dragging signals with measures present
   - Dragging measure rows
   - Verifying row order after operations

5. **Save/Load Functionality**
   - Testing save data structure
   - Verifying version 3.2.1 in saved data

6. **Cycle Operations**
   - Changing cycle count
   - Verifying no errors during operations

7. **Error Detection**
   - Monitoring JavaScript console for errors
   - Ensuring no errors during basic operations

## Manual Testing

If you prefer to run the application manually for testing:

1. **Start a local web server** (from project root):
   ```bash
   python3 -m http.server 8080
   ```

2. **Open in browser**:
   ```
   http://localhost:8080
   ```

## Troubleshooting

### Port Already in Use
If port 8080 is already in use:
- Stop the process using port 8080, or
- Edit `playwright.config.js` and change the port number

### Browser Installation Issues
If browsers fail to install:
```bash
npx playwright install --with-deps
```

### Test Failures
- Check that the application is running on http://localhost:8080
- Verify Python 3 is installed: `python3 --version`
- Review the HTML report: `npm run test:report`
- Run tests in headed mode to see what's happening: `npm run test:headed`

### Clear Test Cache
```bash
rm -rf playwright-report test-results
```

## CI/CD Integration

To run tests in CI/CD:

```bash
# Install dependencies
npm ci
npx playwright install --with-deps

# Run tests
npm test
```

Set the `CI` environment variable to enable CI-specific settings:
```bash
CI=true npm test
```

## Writing New Tests

Add new tests to `tests/playwright/timing-gen.spec.js`:

```javascript
test('should do something', async ({ page }) => {
  await page.goto('/');
  // Your test code here
  await expect(page.getByText('Something')).toBeVisible();
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)

## Version

Current test suite version: 3.2.1
