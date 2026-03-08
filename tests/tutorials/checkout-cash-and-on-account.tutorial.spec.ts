import { expect, test, type Page } from "../e2e/support/test";
import { createTutorialActorSnapshot } from "./support/tutorial-actor-snapshot";
import { createTutorialDriver } from "./support/tutorial-driver";

test.use({
  loginAsAppUserId: null,
});

interface CatalogProductFixture {
  readonly id: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly stock: number;
  readonly isActive: boolean;
}

interface CreateSaleRequestPayload {
  readonly items?: readonly {
    readonly productId?: string;
    readonly quantity?: number;
  }[];
  readonly paymentMethod?: string;
  readonly cashRegisterId?: string;
  readonly customerId?: string;
  readonly customerName?: string;
  readonly initialPaymentAmount?: number;
}

const registerId = "cash-register-main";
const actorId = "user_manager_maxi";
const actorDisplayName = "Maxi";
const tutorialActorSnapshot = createTutorialActorSnapshot({
  actorId,
  displayName: actorDisplayName,
  assignedRegisterIds: [registerId],
});
const tutorialProducts: readonly CatalogProductFixture[] = [
  {
    id: "product-cash-001",
    name: "Agua mineral 500 ml",
    categoryId: "drink",
    price: 1200,
    stock: 24,
    isActive: true,
  },
  {
    id: "product-account-001",
    name: "Galletitas surtidas",
    categoryId: "snacks",
    price: 1500,
    stock: 18,
    isActive: true,
  },
];
const tutorialCustomerName = "Cliente tutorial";

function calculateSaleTotal(items: CreateSaleRequestPayload["items"]): number {
  return (items ?? []).reduce((sum, item) => {
    const product = tutorialProducts.find((candidate) => candidate.id === item.productId);
    const quantity = Number(item.quantity ?? 0);
    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      return sum;
    }

    return sum + product.price * quantity;
  }, 0);
}

async function createCheckoutTutorialRoutes(page: Page): Promise<void> {
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
          items: tutorialProducts,
        }),
      });
      return;
    }

    if (method === "GET" && pathname === "/api/v1/customers") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [],
        }),
      });
      return;
    }

    if (method === "POST" && pathname === "/api/v1/sales") {
      let payload: CreateSaleRequestPayload = {};
      try {
        payload = request.postDataJSON() as CreateSaleRequestPayload;
      } catch {
        payload = {};
      }

      const total = calculateSaleTotal(payload.items);
      if (payload.paymentMethod === "cash") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            saleId: "sale-tutorial-cash-001",
            paymentMethod: "cash",
            amountPaid: total,
            outstandingAmount: 0,
          }),
        });
        return;
      }

      if (payload.paymentMethod === "on_account") {
        if (!payload.customerId && !payload.customerName) {
          await route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              code: "validation_error",
              message:
                "Elegi un cliente existente o toca crear cliente nuevo antes de cobrar.",
            }),
          });
          return;
        }

        const initialPaymentAmount = Number(payload.initialPaymentAmount ?? 0);
        const normalizedInitialPaymentAmount = Number.isFinite(initialPaymentAmount)
          ? Math.max(0, initialPaymentAmount)
          : 0;

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            saleId: "sale-tutorial-on-account-001",
            paymentMethod: "on_account",
            customerId: payload.customerId ?? "customer-tutorial-001",
            amountPaid: normalizedInitialPaymentAmount,
            outstandingAmount: Math.max(0, total - normalizedInitialPaymentAmount),
          }),
        });
        return;
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: "validation_error",
          message: "Metodo de pago no soportado en el tutorial.",
        }),
      });
      return;
    }

    await route.continue();
  });
}

test("records a paced checkout tutorial for cash and on-account payments", async ({
  page,
}) => {
  await createCheckoutTutorialRoutes(page);

  await page.goto("/cash-register");
  await expect(page.getByTestId("product-card-product-cash-001")).toBeVisible();

  const tutorial = createTutorialDriver(page);
  await tutorial.installOverlay("Tutorial: cobro en efectivo y cuenta corriente");
  await tutorial.intro(
    "En este recorrido vamos a registrar una venta en efectivo y otra en cuenta corriente.",
  );

  await tutorial.click(
    page.getByTestId("product-card-product-cash-001"),
    "Selecciona un producto para armar la primera venta.",
  );
  await tutorial.click(
    page.getByTestId("checkout-open-payment-button"),
    "Cuando el pedido esta listo, avanza al paso de cobro.",
  );
  await expect(page.getByTestId("checkout-payment-modal")).toBeVisible();

  await tutorial.fill(
    page.getByTestId("checkout-cash-received-input"),
    "1200.00",
    "Ingresa el efectivo que entrega el cliente.",
  );
  await tutorial.click(
    page.getByTestId("checkout-confirm-payment-button"),
    "Confirma el cobro para registrar la venta en efectivo.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  const checkoutFeedback = page.getByTestId("checkout-feedback");
  await expect(checkoutFeedback).toContainText("Venta registrada correctamente.");
  await expect(page.getByTestId("checkout-payment-modal")).not.toBeVisible();
  await tutorial.message(
    "La venta en efectivo queda registrada y el pedido se limpia para empezar una nueva operacion.",
  );

  await tutorial.click(
    page.getByTestId("product-card-product-account-001"),
    "Ahora agrega otro producto para mostrar el cobro en cuenta corriente.",
  );
  await tutorial.click(
    page.getByTestId("checkout-open-payment-button"),
    "Abre nuevamente el modal de cobro.",
  );
  await expect(page.getByTestId("checkout-payment-modal")).toBeVisible();

  await tutorial.click(
    page.getByTestId("checkout-payment-on-account-button"),
    "Cambia el metodo a cuenta corriente.",
  );
  await tutorial.fill(
    page.getByTestId("checkout-customer-name-input"),
    tutorialCustomerName,
    "Escribe el nombre del cliente para asociar la venta.",
  );
  await expect(page.getByTestId("checkout-customer-create-button")).toBeVisible();
  await tutorial.click(
    page.getByTestId("checkout-customer-create-button"),
    "Si el cliente todavia no existe, puedes crearlo en este mismo paso.",
  );
  await expect(page.getByTestId("checkout-selected-customer-card")).toContainText(
    tutorialCustomerName,
  );

  await tutorial.fill(
    page.getByTestId("checkout-on-account-initial-payment-input"),
    "500.00",
    "Opcionalmente registra un pago inicial para reducir el saldo pendiente.",
  );
  await expect(page.getByTestId("checkout-on-account-remaining-value")).toHaveText(
    "$1000.00",
  );
  await tutorial.click(
    page.getByTestId("checkout-confirm-payment-button"),
    "Confirma la venta para dejar el saldo pendiente en la cuenta del cliente.",
    {
      afterMs: tutorial.defaults.successHoldMs,
    },
  );

  await expect(page.getByTestId("checkout-payment-modal")).not.toBeVisible();
  await expect(checkoutFeedback).toContainText("Venta registrada correctamente.");
  await expect(checkoutFeedback).toContainText(tutorialCustomerName);
  await expect(checkoutFeedback).toContainText("Saldo pendiente: $1000.00.");
  await tutorial.message(
    "Asi se registra una venta en cuenta corriente con un pago inicial y un saldo pendiente para cobrar despues.",
    2_800,
  );
});
