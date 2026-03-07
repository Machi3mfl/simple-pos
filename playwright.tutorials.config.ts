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

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const rawValue = process.env[name]?.trim();
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return parsedValue;
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
const tutorialSlowMoMs = readPositiveIntegerEnv("TUTORIAL_SLOW_MO_MS", 150);

export default defineConfig({
  testDir: "./tests/tutorials",
  globalSetup: "./tests/e2e/support/globalSetup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "./test-results/tutorials",
  use: {
    baseURL: externalBaseUrl ?? defaultBaseUrl,
    trace: "off",
    screenshot: "off",
    video: "on",
    viewport: { width: 1366, height: 900 },
    headless: process.env.TUTORIAL_HEADED === "1" ? false : true,
    launchOptions: {
      slowMo: tutorialSlowMoMs,
    },
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
