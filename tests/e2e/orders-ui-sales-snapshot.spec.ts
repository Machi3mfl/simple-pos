import { expect, test, type APIRequestContext } from "@playwright/test";

import { createCatalogProduct } from "./support/catalog";

interface SaleResponse {
  readonly saleId: string;
  readonly total: number;
  readonly amountPaid: number;
  readonly outstandingAmount: number;
}

function parseMoney(raw: string): number {
  return Number(raw.replace(/[^0-9.-]/g, ""));
}

async function createSale(
  request: APIRequestContext,
  input: {
    readonly productId: string;
    readonly quantity: number;
    readonly paymentMethod: "cash" | "on_account";
    readonly customerName?: string;
    readonly initialPaymentAmount?: number;
  },
): Promise<SaleResponse> {
  const response = await request.post("/api/v1/sales", {
    data: {
      items: [{ productId: input.productId, quantity: input.quantity }],
      paymentMethod: input.paymentMethod,
      customerName: input.customerName,
      createCustomerIfMissing: input.customerName ? true : undefined,
      initialPaymentAmount: input.initialPaymentAmount,
    },
  });

  expect(response.status()).toBe(201);
  return (await response.json()) as SaleResponse;
}

test("shows a snapshot list of all recorded sales in Orders workspace", async ({
  request,
  page,
}) => {
  test.skip(
    process.env.POS_BACKEND_MODE !== "supabase",
    "This suite validates real backend persistence with POS_BACKEND_MODE=supabase.",
  );

  const marker = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const productName = `Producto Pedidos ${marker}`;
  const customerName = `Cliente Pedidos ${marker}`;

  await page.goto("/orders");

  await expect(page.getByRole("heading", { name: "Listado de ventas" })).toBeVisible();
  const refreshButton = page.getByTestId("orders-refresh-button");
  await expect(refreshButton).toBeEnabled();
  await refreshButton.click();
  await expect(refreshButton).toHaveText("Actualizar");

  const beforeTotalCount = Number(
    (await page.getByTestId("orders-total-count").textContent()) ?? "0",
  );
  const beforeRevenue = parseMoney(
    (await page.getByTestId("orders-total-revenue").textContent()) ?? "$0",
  );
  const beforeCollected = parseMoney(
    (await page.getByTestId("orders-total-collected").textContent()) ?? "$0",
  );
  const beforeOutstanding = parseMoney(
    (await page.getByTestId("orders-total-outstanding").textContent()) ?? "$0",
  );

  const product = await createCatalogProduct(request, {
    name: productName,
    price: 10,
  });
  const cashSale = await createSale(request, {
    productId: product.id,
    quantity: 1,
    paymentMethod: "cash",
  });
  const onAccountSale = await createSale(request, {
    productId: product.id,
    quantity: 2,
    paymentMethod: "on_account",
    customerName,
    initialPaymentAmount: 5,
  });

  await refreshButton.click();
  await expect(refreshButton).toHaveText("Actualizar");

  await expect(page.getByTestId("orders-total-count")).toHaveText(
    String(beforeTotalCount + 2),
  );
  await expect(page.getByTestId("orders-total-revenue")).toHaveText(
    `$${(beforeRevenue + 30).toFixed(2)}`,
  );
  await expect(page.getByTestId("orders-total-collected")).toHaveText(
    `$${(beforeCollected + 15).toFixed(2)}`,
  );
  await expect(page.getByTestId("orders-total-outstanding")).toHaveText(
    `$${(beforeOutstanding + 15).toFixed(2)}`,
  );

  await expect(page.getByTestId(`orders-sale-item-${cashSale.saleId}`)).toBeVisible();
  await expect(page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`)).toBeVisible();
  await expect(page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`)).not.toContainText(
    customerName,
  );
  await expect(page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`)).not.toContainText(
    onAccountSale.saleId,
  );
  await expect(page.getByTestId(`orders-sale-status-${onAccountSale.saleId}`)).toHaveText(
    "Parcial",
  );
  await expect(page.getByTestId(`orders-sale-outstanding-${onAccountSale.saleId}`)).toHaveText(
    "$15",
  );

  await page.getByTestId("orders-payment-method-filter").selectOption("on_account");
  await expect(page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`)).toBeVisible();
  await expect(page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`)).not.toContainText(
    customerName,
  );
  await expect(
    page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`),
  ).not.toContainText("Registrar pago");
  await expect(
    page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`),
  ).not.toContainText("Ver detalle del pedido");
  await page.getByTestId(`orders-sale-item-${onAccountSale.saleId}`).click();
  await expect(page.getByTestId("orders-sale-detail-modal")).toBeVisible();
  await expect(
    page.getByTestId(`orders-sale-detail-item-${onAccountSale.saleId}-${product.id}`),
  ).toContainText(productName);
  await expect(page.getByTestId("orders-sale-detail-modal")).toContainText(customerName);
  await page.getByTestId("orders-sale-detail-modal").getByRole("button", { name: "Cerrar" }).click();

  await page.getByTestId("orders-payment-method-filter").selectOption("all");
  await expect(page.getByTestId("orders-total-collected")).toHaveText(
    `$${(beforeCollected + 15).toFixed(2)}`,
  );
  await expect(page.getByTestId("orders-total-outstanding")).toHaveText(
    `$${(beforeOutstanding + 15).toFixed(2)}`,
  );
});
