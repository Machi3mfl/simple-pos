import { type Locator, type Page } from "@playwright/test";

export interface TutorialTimingConfig {
  readonly stepDelayMs: number;
  readonly typingDelayMs: number;
  readonly successHoldMs: number;
  readonly navigationHoldMs: number;
  readonly introHoldMs: number;
}

export interface TutorialActionOptions {
  readonly afterMs?: number;
  readonly beforeMs?: number;
}

const OVERLAY_ID = "codex-tutorial-overlay";

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

export function readTutorialTimingConfig(): TutorialTimingConfig {
  return {
    stepDelayMs: readPositiveIntegerEnv("TUTORIAL_STEP_DELAY_MS", 1_400),
    typingDelayMs: readPositiveIntegerEnv("TUTORIAL_TYPING_DELAY_MS", 90),
    successHoldMs: readPositiveIntegerEnv("TUTORIAL_SUCCESS_HOLD_MS", 2_200),
    navigationHoldMs: readPositiveIntegerEnv("TUTORIAL_NAVIGATION_HOLD_MS", 1_800),
    introHoldMs: readPositiveIntegerEnv("TUTORIAL_INTRO_HOLD_MS", 2_400),
  };
}

export class TutorialDriver {
  private readonly page: Page;
  private readonly timing: TutorialTimingConfig;
  private stepCounter = 0;

  constructor(page: Page, timing: TutorialTimingConfig = readTutorialTimingConfig()) {
    this.page = page;
    this.timing = timing;
  }

  get defaults(): TutorialTimingConfig {
    return this.timing;
  }

  async installOverlay(title: string): Promise<void> {
    await this.page.evaluate(
      ({ overlayId, titleText }) => {
        const existingOverlay = document.getElementById(overlayId);
        if (existingOverlay) {
          existingOverlay.remove();
        }

        const overlay = document.createElement("section");
        overlay.id = overlayId;
        overlay.setAttribute("aria-hidden", "true");
        overlay.style.position = "fixed";
        overlay.style.top = "24px";
        overlay.style.left = "24px";
        overlay.style.zIndex = "2147483647";
        overlay.style.width = "min(420px, calc(100vw - 48px))";
        overlay.style.padding = "18px 20px";
        overlay.style.borderRadius = "20px";
        overlay.style.background = "rgba(15, 23, 42, 0.86)";
        overlay.style.color = "#f8fafc";
        overlay.style.boxShadow = "0 18px 48px rgba(15, 23, 42, 0.38)";
        overlay.style.border = "1px solid rgba(148, 163, 184, 0.28)";
        overlay.style.pointerEvents = "none";
        overlay.style.fontFamily =
          "\"Avenir Next\", \"Segoe UI\", sans-serif";

        const eyebrow = document.createElement("p");
        eyebrow.textContent = "Demo guiada";
        eyebrow.style.margin = "0 0 6px";
        eyebrow.style.fontSize = "12px";
        eyebrow.style.fontWeight = "700";
        eyebrow.style.letterSpacing = "0.12em";
        eyebrow.style.textTransform = "uppercase";
        eyebrow.style.color = "#cbd5e1";

        const titleElement = document.createElement("h1");
        titleElement.id = `${overlayId}-title`;
        titleElement.textContent = titleText;
        titleElement.style.margin = "0 0 10px";
        titleElement.style.fontSize = "24px";
        titleElement.style.lineHeight = "1.15";

        const body = document.createElement("p");
        body.id = `${overlayId}-body`;
        body.textContent = "Preparando tutorial...";
        body.style.margin = "0";
        body.style.fontSize = "17px";
        body.style.lineHeight = "1.45";
        body.style.color = "#e2e8f0";

        overlay.append(eyebrow, titleElement, body);
        document.body.appendChild(overlay);
      },
      { overlayId: OVERLAY_ID, titleText: title },
    );
  }

  async goto(url: string, message: string, options: TutorialActionOptions = {}): Promise<void> {
    await this.setMessage(message);
    await this.hold(options.beforeMs ?? this.timing.stepDelayMs);
    await this.page.goto(url);
    await this.hold(options.afterMs ?? this.timing.navigationHoldMs);
  }

  async intro(message: string, holdMs = this.timing.introHoldMs): Promise<void> {
    await this.setMessage(message);
    await this.hold(holdMs);
  }

  async step(
    message: string,
    action: () => Promise<void>,
    options: TutorialActionOptions = {},
  ): Promise<void> {
    this.stepCounter += 1;
    await this.setMessage(`Paso ${this.stepCounter}. ${message}`);
    await this.hold(options.beforeMs ?? this.timing.stepDelayMs);
    await action();
    await this.hold(options.afterMs ?? this.timing.stepDelayMs);
  }

  async click(locator: Locator, message: string, options: TutorialActionOptions = {}): Promise<void> {
    await this.step(message, async () => {
      await locator.click();
    }, options);
  }

  async fill(locator: Locator, value: string, message: string, options: TutorialActionOptions = {}): Promise<void> {
    await this.step(message, async () => {
      await locator.click();
      await locator.fill("");
      await locator.type(value, {
        delay: this.timing.typingDelayMs,
      });
    }, options);
  }

  async select(locator: Locator, value: string, message: string, options: TutorialActionOptions = {}): Promise<void> {
    await this.step(message, async () => {
      await locator.selectOption(value);
    }, options);
  }

  async message(message: string, holdMs = this.timing.successHoldMs): Promise<void> {
    await this.setMessage(message);
    await this.hold(holdMs);
  }

  async hold(durationMs: number): Promise<void> {
    if (durationMs <= 0) {
      return;
    }

    await this.page.waitForTimeout(durationMs);
  }

  private async setMessage(message: string): Promise<void> {
    await this.page.evaluate(
      ({ overlayId, nextMessage }) => {
        const overlayBody = document.getElementById(`${overlayId}-body`);
        if (!overlayBody) {
          return;
        }

        overlayBody.textContent = nextMessage;
      },
      { overlayId: OVERLAY_ID, nextMessage: message },
    );
  }
}

export function createTutorialDriver(page: Page): TutorialDriver {
  return new TutorialDriver(page);
}
