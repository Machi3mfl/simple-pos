import { expect, test } from "./support/test";
import { z } from "zod";

import { debtPaymentResponseDTOSchema } from "../../src/modules/accounts-receivable/presentation/dtos/debt-payment-response.dto";
import { receivablesSnapshotResponseDTOSchema } from "../../src/modules/accounts-receivable/presentation/dtos/receivables-snapshot-response.dto";
import { saleResponseDTOSchema } from "../../src/modules/sales/presentation/dtos/sale-response.dto";
import { customerDebtSummaryResponseDTOSchema } from "../../src/modules/customers/presentation/dtos/customer-debt-summary-response.dto";
import { createCatalogProduct } from "./support/catalog";

const apiErrorResponseSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z
      .array(
        z
          .object({
            field: z.string().min(1),
            message: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

function uniqueCustomerName(): string {
  return `Cliente AR ${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("accounts receivable debt flows", () => {
  test("creates debt per order and reduces outstanding with partial/full payments", async ({
    request,
  }) => {
    const customerName = uniqueCustomerName();
    const firstProduct = await createCatalogProduct(request, {
      name: `AR Product A ${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      price: 10,
    });
    const secondProduct = await createCatalogProduct(request, {
      name: `AR Product B ${Date.now()}-${Math.floor(Math.random() * 10_000)}`,
      price: 10,
    });

    const saleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [
          { productId: firstProduct.id, quantity: 2 },
          { productId: secondProduct.id, quantity: 1 },
        ],
        paymentMethod: "on_account",
        customerName,
        createCustomerIfMissing: true,
        initialPaymentAmount: 12,
      },
    });

    expect(saleResponse.status()).toBe(201);
    const saleBody = await saleResponse.json();
    const parsedSale = saleResponseDTOSchema.safeParse(saleBody);
    expect(parsedSale.success).toBe(true);

    if (!parsedSale.success || !parsedSale.data.customerId) {
      throw new Error("Expected on_account sale to return customerId");
    }

    const customerId = parsedSale.data.customerId;
    const saleId = parsedSale.data.saleId;
    const saleTotal = parsedSale.data.total;
    expect(saleTotal).toBe(30);
    expect(parsedSale.data.amountPaid).toBe(12);
    expect(parsedSale.data.outstandingAmount).toBe(18);

    const initialDebtSummaryResponse = await request.get(
      `/api/v1/customers/${customerId}/debt`,
    );
    expect(initialDebtSummaryResponse.status()).toBe(200);
    const initialDebtSummaryBody = await initialDebtSummaryResponse.json();
    const initialDebtSummary =
      customerDebtSummaryResponseDTOSchema.safeParse(initialDebtSummaryBody);
    expect(initialDebtSummary.success).toBe(true);

    if (!initialDebtSummary.success) {
      throw new Error("Expected valid customer debt summary payload");
    }

    expect(initialDebtSummary.data.outstandingBalance).toBe(18);
    expect(initialDebtSummary.data.totalDebtAmount).toBe(30);
    expect(initialDebtSummary.data.totalPaidAmount).toBe(12);
    expect(initialDebtSummary.data.openOrderCount).toBe(1);
    expect(initialDebtSummary.data.orders).toEqual([
      expect.objectContaining({
        orderId: saleId,
        totalAmount: 30,
        amountPaid: 12,
        outstandingAmount: 18,
        itemCount: 3,
        saleItems: [
          expect.objectContaining({
            productId: firstProduct.id,
            productName: firstProduct.name,
            quantity: 2,
            unitPrice: 10,
            lineTotal: 20,
            productImageUrl: expect.any(String),
          }),
          expect.objectContaining({
            productId: secondProduct.id,
            productName: secondProduct.name,
            quantity: 1,
            unitPrice: 10,
            lineTotal: 10,
            productImageUrl: expect.any(String),
          }),
        ],
      }),
    ]);
    expect(initialDebtSummary.data.ledger.some((entry) => entry.orderId === saleId)).toBe(
      true,
    );
    expect(initialDebtSummary.data.ledger.some((entry) => entry.entryType === "debt")).toBe(
      true,
    );
    expect(
      initialDebtSummary.data.ledger.some(
        (entry) => entry.entryType === "payment" && entry.orderId === saleId && entry.amount === 12,
      ),
    ).toBe(true);

    const receivablesSnapshotResponse = await request.get("/api/v1/receivables");
    expect(receivablesSnapshotResponse.status()).toBe(200);
    const receivablesSnapshotBody = await receivablesSnapshotResponse.json();
    const receivablesSnapshot =
      receivablesSnapshotResponseDTOSchema.safeParse(receivablesSnapshotBody);
    expect(receivablesSnapshot.success).toBe(true);

    if (!receivablesSnapshot.success) {
      throw new Error("Expected valid receivables snapshot payload");
    }

    expect(receivablesSnapshot.data.items).toContainEqual(
      expect.objectContaining({
        customerId,
        customerName,
        outstandingBalance: 18,
        totalDebtAmount: 30,
        totalPaidAmount: 12,
        openOrderCount: 1,
      }),
    );

    const firstPayment = await request.post("/api/v1/debt-payments", {
      data: {
        customerId,
        orderId: saleId,
        amount: 8,
        paymentMethod: "cash",
        notes: "Cobro parcial caja mañana",
      },
    });
    expect(firstPayment.status()).toBe(201);
    const firstPaymentBody = await firstPayment.json();
    expect(debtPaymentResponseDTOSchema.safeParse(firstPaymentBody).success).toBe(true);
    expect(firstPaymentBody.orderId).toBe(saleId);

    const afterFirstPayment = await request.get(`/api/v1/customers/${customerId}/debt`);
    expect(afterFirstPayment.status()).toBe(200);
    const afterFirstPaymentBody = await afterFirstPayment.json();
    const afterFirstPaymentSummary =
      customerDebtSummaryResponseDTOSchema.safeParse(afterFirstPaymentBody);
    expect(afterFirstPaymentSummary.success).toBe(true);

    if (!afterFirstPaymentSummary.success) {
      throw new Error("Expected valid debt summary after first payment");
    }

    expect(afterFirstPaymentSummary.data.outstandingBalance).toBe(10);
    expect(afterFirstPaymentSummary.data.totalDebtAmount).toBe(30);
    expect(afterFirstPaymentSummary.data.totalPaidAmount).toBe(20);
    expect(afterFirstPaymentSummary.data.openOrderCount).toBe(1);
    expect(
      afterFirstPaymentSummary.data.ledger.some((entry) => entry.entryType === "payment"),
    ).toBe(true);
    expect(
      afterFirstPaymentSummary.data.ledger.some(
        (entry) =>
          entry.entryType === "payment" &&
          entry.amount === 8 &&
          entry.notes === "Cobro parcial caja mañana",
      ),
    ).toBe(true);

    const secondPayment = await request.post("/api/v1/debt-payments", {
      data: {
        customerId,
        amount: 10,
        paymentMethod: "cash",
      },
    });
    expect(secondPayment.status()).toBe(201);

    const afterSecondPayment = await request.get(`/api/v1/customers/${customerId}/debt`);
    expect(afterSecondPayment.status()).toBe(200);
    const afterSecondPaymentBody = await afterSecondPayment.json();
    const afterSecondPaymentSummary =
      customerDebtSummaryResponseDTOSchema.safeParse(afterSecondPaymentBody);
    expect(afterSecondPaymentSummary.success).toBe(true);

    if (!afterSecondPaymentSummary.success) {
      throw new Error("Expected valid debt summary after second payment");
    }

    expect(afterSecondPaymentSummary.data.outstandingBalance).toBe(0);
    expect(afterSecondPaymentSummary.data.totalDebtAmount).toBe(30);
    expect(afterSecondPaymentSummary.data.totalPaidAmount).toBe(30);
    expect(afterSecondPaymentSummary.data.openOrderCount).toBe(0);
    expect(afterSecondPaymentSummary.data.orders).toEqual([]);

    const overpayment = await request.post("/api/v1/debt-payments", {
      data: {
        customerId,
        amount: 1,
        paymentMethod: "cash",
      },
    });
    expect(overpayment.status()).toBe(409);
    const overpaymentBody = await overpayment.json();
    expect(apiErrorResponseSchema.safeParse(overpaymentBody).success).toBe(true);
  });

  test("returns not found when debt operations reference unknown customer", async ({
    request,
  }) => {
    const missingCustomerSummary = await request.get(
      "/api/v1/customers/customer-missing-001/debt",
    );
    expect(missingCustomerSummary.status()).toBe(404);
    const missingCustomerSummaryBody = await missingCustomerSummary.json();
    expect(apiErrorResponseSchema.safeParse(missingCustomerSummaryBody).success).toBe(true);

    const missingCustomerPayment = await request.post("/api/v1/debt-payments", {
      data: {
        customerId: "customer-missing-001",
        amount: 10,
        paymentMethod: "cash",
      },
    });
    expect(missingCustomerPayment.status()).toBe(404);
    const missingCustomerPaymentBody = await missingCustomerPayment.json();
    expect(apiErrorResponseSchema.safeParse(missingCustomerPaymentBody).success).toBe(true);
  });
});
