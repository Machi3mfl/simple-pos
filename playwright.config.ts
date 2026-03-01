import { defineConfig } from "@playwright/test";

const defaultBaseUrl = "http://127.0.0.1:3010";
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const shouldReuseExistingServer =
  !process.env.CI && process.env.POS_BACKEND_MODE !== "supabase";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseUrl ?? defaultBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1366, height: 900 },
  },
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run build && npm run start -- --port 3010",
        url: `${defaultBaseUrl}/sales`,
        reuseExistingServer: shouldReuseExistingServer,
        timeout: 180_000,
      },
});
