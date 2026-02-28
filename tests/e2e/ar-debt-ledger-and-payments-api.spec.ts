import { expect, test } from "@playwright/test";
import { z } from "zod";

import { debtPaymentResponseDTOSchema } from "../../src/modules/accounts-receivable/presentation/dtos/debt-payment-response.dto";
import { saleResponseDTOSchema } from "../../src/modules/sales/presentation/dtos/sale-response.dto";
import { customerDebtSummaryResponseDTOSchema } from "../../src/modules/customers/presentation/dtos/customer-debt-summary-response.dto";

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
    const saleResponse = await request.post("/api/v1/sales", {
      data: {
        items: [
          { productId: "prod-ar-001", quantity: 2 },
          { productId: "prod-ar-002", quantity: 1 },
        ],
        paymentMethod: "on_account",
        customerName: uniqueCustomerName(),
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

    expect(initialDebtSummary.data.outstandingBalance).toBe(30);
    expect(initialDebtSummary.data.ledger.some((entry) => entry.orderId === saleId)).toBe(
      true,
    );
    expect(initialDebtSummary.data.ledger.some((entry) => entry.entryType === "debt")).toBe(
      true,
    );

    const firstPayment = await request.post("/api/v1/debt-payments", {
      data: {
        customerId,
        amount: 10,
        paymentMethod: "cash",
      },
    });
    expect(firstPayment.status()).toBe(201);
    const firstPaymentBody = await firstPayment.json();
    expect(debtPaymentResponseDTOSchema.safeParse(firstPaymentBody).success).toBe(true);

    const afterFirstPayment = await request.get(`/api/v1/customers/${customerId}/debt`);
    expect(afterFirstPayment.status()).toBe(200);
    const afterFirstPaymentBody = await afterFirstPayment.json();
    const afterFirstPaymentSummary =
      customerDebtSummaryResponseDTOSchema.safeParse(afterFirstPaymentBody);
    expect(afterFirstPaymentSummary.success).toBe(true);

    if (!afterFirstPaymentSummary.success) {
      throw new Error("Expected valid debt summary after first payment");
    }

    expect(afterFirstPaymentSummary.data.outstandingBalance).toBe(20);
    expect(
      afterFirstPaymentSummary.data.ledger.some((entry) => entry.entryType === "payment"),
    ).toBe(true);

    const secondPayment = await request.post("/api/v1/debt-payments", {
      data: {
        customerId,
        amount: 20,
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
