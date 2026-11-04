# Tank Dashboard

## Overview

- **Part A:** Tank level dashboard built with React, Vite, TypeScript, and Tailwind CSS.
- **Part B:** Device API client and Jest tests using mocked `fetch` responses.

## Folder layout

- `src/` — dashboard application at the repository root.
- `api-tests/` — device API client, Jest tests, and test plan.

## Run the dashboard

From the repository root:

```bash
npm install
npm run dev
```

To create a production build:

```bash
npm run build
```

## Run the tests

From the repository root, run the dashboard tests with Vitest:

```bash
npm test
```

From `api-tests/`, run the API client tests with Jest:

```bash
cd api-tests
npm install
npm test
```

See the [API test plan](api-tests/TEST_PLAN.md).

## AI Tool Note

Tool: OpenAI Codex (built in phases, one prompt per phase), plus Claude to review the output and suggest extra tests.
Prompts: see "Prompts Used" below (Phase 1: dashboard, Phase 3: Jest tests).
What it got wrong: Codex's tests covered only the timeout path for API-05, even though my test plan lists 503/504 as offline too. I added a 503 test and the remaining plan cases (API-03, 07, 09) by hand, so all 10 plan items are automated.

## Prompts Used

### Phase 1 prompt:

I'm doing a small internship assignment and want to build it in phases. This is phase 1 of 4: the tank level dashboard.

Please create in this folder using React + Vite + TypeScript + Tailwind CSS. Keep it simple, since I need to explain every part in an interview.

Put this mock data in src/data.ts:
[{"timestamp":"2026-11-02T06:00:00","level_percent":78},{"timestamp":"2026-11-02T08:00:00","level_percent":64},{"timestamp":"2026-11-02T10:00:00","level_percent":51},{"timestamp":"2026-11-02T12:00:00","level_percent":37},{"timestamp":"2026-11-02T14:00:00","level_percent":24},{"timestamp":"2026-11-02T16:00:00","level_percent":18},{"timestamp":"2026-11-02T18:00:00","level_percent":42},{"timestamp":"2026-11-02T20:00:00","level_percent":55}]

The page should show:

1. Current level (the latest reading), plus today's min and max. The data is from a fixed day, so treat "today" as the date of the latest reading, not the system date.
2. A visible alert banner when the level is below 20%. Also list any earlier readings that dropped below 20%, so a dip like 18% at 16:00 isn't missed.
3. A simple tank/progress bar that changes colour as the level drops.
   Sort the readings by timestamp before using them, and handle empty data without crashing. Put the calculation logic (current, min, max, alerts) in a separate file, src/tankStats.ts, so it's easy to read and test.

When you're done, don't commit anything. Stop and tell me: (1) how to run it, (2) what I should check in the browser.

### Phase 3 prompt:

Phase 3 of 4: automate the tests from api-tests/TEST_PLAN.md.

Set up Jest inside the api-tests/ folder (install it there as a devDependency, add a "test" script to api-tests/package.json, keep it CommonJS). Write api-tests/deviceClient.test.js. Mock the API by replacing global.fetch with jest.fn(), no real network calls. Mock responses need status, ok and a json() method.

Automate at least 7 test cases from the plan: API-01 (happy path), API-02 (invalid token), API-04 (device not found), API-05 (timeout/offline), API-06 (malformed JSON), API-08 (level out of range), API-10 (stale last_seen). Name each test with its ID from TEST_PLAN.md.

Notes:

- For the timeout test, make the mocked fetch reject with an error whose name is "AbortError".
- For the stale last_seen test, build the timestamp relative to Date.now() (or use Jest fake timers), so the test doesn't break over time. Also test a fresh last_seen gives last_seen_stale: false.
  The root project uses Vitest for src/ tests. Make sure Vitest doesn't pick up the Jest tests: restrict it to src/ in vite.config.ts (test.include or test.exclude). Then run npm test at the root AND npm test inside api-tests/, and show me both outputs. If anything fails, tell me why before changing code, so I understand what went wrong.

When you're done, don't commit.

## Wi-Fi Loss Testing

To test the app when the device loses Wi-Fi mid-operation I would reproduce it on a real phone and an Android emulator by turning Wi-Fi or airplane mode off at various points: while logging in and while the status request is in flight and immediately after sending a pump on/off command.

For each of those cases I would check that the app displays a clear offline or timeout message (rather than just hanging on a spinner or crashing), that the request times out in the expected time and that the UI doesn't show a made-up state (e.g. showing the pump as "on" when the command never actually got to the device).

I would then turn the connection back on and check that the app either recovers automatically or allows the user to retry, that it re-fetches the real pump state from the server (rather than just relying on what it thought it was) and that the auth token is still valid. I would also check that on retry it doesn't send the same command twice and that the last known reading is clearly displayed as old data (using the stale last_seen check from the API tests).

For automation I would mock network failures (rejected fetch calls, timeouts, slow responses) in the same way as i would in the Jest tests and use network throttling and offline mode in the emulator or browser dev tools to test slow and flaky connections, not just a complete loss of connection.
