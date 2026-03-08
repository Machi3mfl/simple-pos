import { expect, test, type Page } from "../e2e/support/test";
import {
  getActorSessionCookieName,
  serializeActorSessionCookie,
} from "@/modules/access-control/infrastructure/session/actorSessionCookie";
import type { CashMovementResponseDTO } from "../../src/modules/cash-management/presentation/dtos/cash-movement-response.dto";
import type { CashRegisterSessionDetailResponseDTO } from "../../src/modules/cash-management/presentation/dtos/cash-register-session-response.dto";
import { createTutorialActorSnapshot } from "./support/tutorial-actor-snapshot";
import { createTutorialDriver } from "./support/tutorial-driver";

test.use({
  loginAsAppUserId: null,
});

type CashRegisterSessionSummaryDTO = Omit<
  CashRegisterSessionDetailResponseDTO,
  "movements"
>;

const registerId = "cash-register-main";
const registerName = "Caja principal";
const actorId = "user_manager_maxi";
const actorDisplayName = "Maxi";
const tutorialActorSnapshot = createTutorialActorSnapshot({
  actorId,
  displayName: actorDisplayName,
  assignedRegisterIds: [registerId],
});

function stripMovements(
  session: CashRegisterSessionDetailResponseDTO,
): CashRegisterSessionSummaryDTO {
  const { movements, ...summary } = session;
  return summary;
}

function createOpeningMovement(amount: number, occurredAt: string): CashMovementResponseDTO {
  return {
    id: "cash-movement-opening",
    movementType: "opening_float",
    direction: "inbound",
    amount,
    occurredAt,
    performedByUserId: actorId,
    performedByDisplayName: actorDisplayName,
  };
}

async function createCashRegisterTutorialRoutes(page: Page): Promise<void> {
  let activeSession: CashRegisterSessionDetailResponseDTO | null = null;
  let movementCounter = 0;

  const buildRegistersResponse = (): {
    readonly items: readonly {
      readonly id: string;
      readonly name: string;
      readonly isActive: boolean;
      readonly activeSession: CashRegisterSessionSummaryDTO | null;
    }[];
  } => ({
    items: [
      {
        id: registerId,
        name: registerName,
        isActive: true,
        activeSession: activeSession ? stripMovements(activeSession) : null,
      },
    ],
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (method === "GET" && pathname === "/api/v1/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(tutorialActorSnapshot),
      });
      return;
    }

    if (method === "GET" && pathname === "/api/v1/products") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
        }),
      });
      return;
    }

    if (method === "GET" && pathname === "/api/v1/cash-registers") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(buildRegistersResponse()),
      });
      return;
    }

    if (
      method === "GET" &&
      pathname === `/api/v1/cash-registers/${registerId}/active-session`
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: activeSession,
        }),
      });
      return;
    }

    if (method === "POST" && pathname === "/api/v1/cash-register-sessions") {
      const payload = request.postDataJSON() as {
        readonly openingFloatAmount?: number;
      };
      const openingFloatAmount = Number(payload.openingFloatAmount ?? 0);
      const now = new Date().toISOString();

      activeSession = {
        id: "cash-session-tutorial",
        cashRegisterId: registerId,
        status: "open",
        openingFloatAmount,
        expectedBalanceAmount: openingFloatAmount,
        openedAt: now,
        openedByUserId: actorId,
        openedByDisplayName: actorDisplayName,
        movements: [createOpeningMovement(openingFloatAmount, now)],
      };

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(stripMovements(activeSession)),
      });
      return;
    }

    if (
      method === "POST" &&
      pathname === "/api/v1/cash-register-sessions/cash-session-tutorial/movements"
    ) {
      if (!activeSession) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "session_not_open",
            message: "No hay una sesion abierta.",
          }),
        });
        return;
      }

      const payload = request.postDataJSON() as {
        readonly amount?: number;
        readonly notes?: string;
      };
      const amount = Number(payload.amount ?? 0);
      movementCounter += 1;
      const movement: CashMovementResponseDTO = {
        id: `cash-movement-${movementCounter}`,
        movementType: "safe_drop",
        direction: "outbound",
        amount,
        notes: payload.notes,
        occurredAt: new Date().toISOString(),
        performedByUserId: actorId,
        performedByDisplayName: actorDisplayName,
      };

      activeSession = {
        ...activeSession,
        expectedBalanceAmount: Number(
          (activeSession.expectedBalanceAmount - amount).toFixed(2),
        ),
        movements: [...activeSession.movements, movement],
      };

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(activeSession),
      });
      return;
    }

    if (
      method === "POST" &&
      pathname === "/api/v1/cash-register-sessions/cash-session-tutorial/close"
    ) {
      if (!activeSession) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "session_not_open",
            message: "No hay una sesion abierta.",
          }),
        });
        return;
      }

      const payload = request.postDataJSON() as {
        readonly countedClosingAmount?: number;
      };
      const countedClosingAmount = Number(payload.countedClosingAmount ?? 0);
      const closedSession: CashRegisterSessionSummaryDTO = {
        ...stripMovements(activeSession),
        status: "closed",
        countedClosingAmount,
        discrepancyAmount: Number(
          (countedClosingAmount - activeSession.expectedBalanceAmount).toFixed(2),
        ),
        closedAt: new Date().toISOString(),
        closedByUserId: actorId,
        closedByDisplayName: actorDisplayName,
      };
      activeSession = null;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(closedSession),
      });
      return;
    }

    await route.continue();
  });
}

test("records a paced cash-register tutorial for open movement and close", async ({
  baseURL,
  page,
}) => {
  await createCashRegisterTutorialRoutes(page);

  await page.context().addCookies([
    {
      name: getActorSessionCookieName(),
      value: serializeActorSessionCookie({
        userId: actorId,
        supportUserId: "user_admin_soporte",
      }),
      url: baseURL ?? "http://127.0.0.1:3010",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/cash-register");
  await expect(page.getByTestId("open-cash-session-modal-button")).toBeVisible();
  await page.getByTestId("open-cash-session-modal-button").click();
  await expect(page.getByTestId("cash-session-overview-modal")).toBeVisible();

  const cashSessionPanel = page.getByTestId("cash-session-panel");
  await expect(cashSessionPanel).toBeVisible();

  const tutorial = createTutorialDriver(page);
  await tutorial.installOverlay("Tutorial: uso basico de caja");
  await tutorial.intro(
    "En este recorrido vamos a abrir la caja, registrar un retiro manual y cerrar el turno.",
  );

  await tutorial.fill(
    page.getByTestId("cash-session-opening-float-input"),
    "1200.00",
    "Ingresa el cambio inicial para abrir la caja.",
  );
  await tutorial.click(
    page.getByTestId("cash-session-open-button"),
    "Confirma la apertura de la caja.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  const activeSummary = page.getByTestId("cash-session-active-summary");
  await expect(activeSummary).toBeVisible();
  await expect(activeSummary).toContainText("$1200.00");
  await tutorial.message(
    "La caja ya quedo abierta y el resumen muestra el saldo esperado.",
  );

  await tutorial.click(
    page.getByTestId("cash-session-add-movement-button"),
    "Abre el formulario para registrar un movimiento manual.",
  );
  await expect(page.getByTestId("cash-session-movement-modal")).toBeVisible();

  await tutorial.select(
    page.getByTestId("cash-session-movement-type-select"),
    "safe_drop",
    "Selecciona el tipo de movimiento que quieres registrar.",
  );
  await tutorial.fill(
    page.getByTestId("cash-session-movement-amount-input"),
    "35.00",
    "Carga el monto del retiro.",
  );
  await tutorial.fill(
    page.getByTestId("cash-session-movement-notes-input"),
    "Retiro de prueba para tutorial",
    "Agrega una nota breve para dejar el movimiento identificado.",
  );
  await tutorial.click(
    page.getByTestId("cash-session-movement-submit-button"),
    "Guarda el movimiento para actualizar el saldo de la caja.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  await expect(page.getByTestId("cash-session-movement-modal")).not.toBeVisible();
  await expect(activeSummary).toContainText("$1165.00");
  await expect(page.getByText("Retiro a caja fuerte")).toBeVisible();
  await tutorial.message(
    "El retiro queda registrado en el historial y el saldo esperado se actualiza en el momento.",
  );

  await tutorial.click(
    page.getByTestId("cash-session-close-button"),
    "Cuando termina el turno, abre el cierre de caja.",
  );
  await expect(page.getByTestId("cash-session-close-modal")).toBeVisible();

  await tutorial.fill(
    page.getByTestId("cash-session-counted-input"),
    "1165.00",
    "Ingresa el efectivo contado antes de confirmar el cierre.",
  );
  await tutorial.click(
    page.getByTestId("cash-session-close-submit-button"),
    "Confirma el cierre para finalizar la sesion.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  await expect(page.getByTestId("cash-session-close-modal")).not.toBeVisible();
  await expect(page.getByTestId("cash-session-opening-float-input")).toBeVisible();
  await tutorial.message(
    "La caja quedo cerrada y esta lista para una nueva apertura.",
    2_800,
  );
});
