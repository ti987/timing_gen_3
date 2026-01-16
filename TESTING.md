# Testing Guide - Timing Gen 3

## Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install
```

### 2. Run Tests
```bash
npm test
```

## Detailed Instructions

See [tests/playwright/README.md](tests/playwright/README.md) for complete testing documentation.

## Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests (headless) |
| `npm run test:headed` | Run tests with visible browser |
| `npm run test:debug` | Debug tests step-by-step |
| `npm run test:ui` | Interactive test UI |
| `npm run test:report` | View HTML test report |

## Manual Testing

Start a local server:
```bash
python3 -m http.server 8080
```

Open browser to: `http://localhost:8080`
