import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { defineConfig } from "@playwright/test";

function readLocalEnvValue(name: string): string | null {
  const envFilePath = join(process.cwd(), ".env.local");
  if (!existsSync(envFilePath)) {
    return null;
  }

  const matchedLine = readFileSync(envFilePath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${name}=`));

  if (!matchedLine) {
    return null;
  }

  const rawValue = matchedLine.slice(name.length + 1).trim();
  if (
    (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
    (rawValue.startsWith("'") && rawValue.endsWith("'"))
  ) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

for (const envName of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]) {
  if (!process.env[envName]) {
    const localValue = readLocalEnvValue(envName);
    if (localValue) {
      process.env[envName] = localValue;
    }
  }
}

const defaultBaseUrl = "http://127.0.0.1:3010";
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const shouldReuseExistingServer =
  !process.env.CI && process.env.POS_BACKEND_MODE !== "supabase";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/support/globalSetup.ts",
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
        url: `${defaultBaseUrl}/login`,
        reuseExistingServer: shouldReuseExistingServer,
        timeout: 180_000,
      },
});
