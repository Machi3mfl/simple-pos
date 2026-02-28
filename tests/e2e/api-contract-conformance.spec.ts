import { expect, test } from "@playwright/test";
import { z } from "zod";

import { createDebtPaymentDTOSchema } from "../../src/modules/accounts-receivable/presentation/dtos/create-debt-payment.dto";
import { debtPaymentResponseDTOSchema } from "../../src/modules/accounts-receivable/presentation/dtos/debt-payment-response.dto";
import {
  bulkPriceUpdateDTOSchema,
} from "../../src/modules/catalog/presentation/dtos/bulk-price-update.dto";
import { createProductDTOSchema } from "../../src/modules/catalog/presentation/dtos/create-product.dto";
import { createStockMovementDTOSchema } from "../../src/modules/inventory/presentation/dtos/create-stock-movement.dto";
import { listStockMovementsResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/list-stock-movements-response.dto";
import { stockMovementResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/stock-movement-response.dto";
import { createSaleDTOSchema } from "../../src/modules/sales/presentation/dtos/create-sale.dto";
import { saleResponseDTOSchema } from "../../src/modules/sales/presentation/dtos/sale-response.dto";
import { syncEventsBatchDTOSchema } from "../../src/modules/sync/presentation/dtos/sync-events-batch.dto";
import saleCashSuccessFixture from "../fixtures/mock-api/sale-cash-success.json";
import saleOnAccountMissingCustomerErrorFixture from "../fixtures/mock-api/sale-on-account-missing-customer-error.json";
import saleOnAccountSuccessFixture from "../fixtures/mock-api/sale-on-account-success.json";
import saleUnsupportedMethodErrorFixture from "../fixtures/mock-api/sale-unsupported-method-error.json";
import { customerDebtSummaryResponseDTOSchema } from "../../src/modules/customers/presentation/dtos/customer-debt-summary-response.dto";

const apiErrorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.array(z.object({
    field: z.string().min(1),
    message: z.string().min(1),
  }).strict()).optional(),
}).strict();

test.describe("API contract conformance", () => {
  test("validates request examples against DTO schemas", () => {
    const validSaleExamples = [
      {
        items: [{ productId: "product-001", quantity: 2 }],
        paymentMethod: "cash",
      },
      {
        items: [{ productId: "product-002", quantity: 1 }],
        paymentMethod: "on_account",
        customerName: "Carlos Perez",
      },
    ];

    validSaleExamples.forEach((example) => {
      const result = createSaleDTOSchema.safeParse(example);
      expect(result.success).toBe(true);
    });

    const invalidOnAccountWithoutCustomer = createSaleDTOSchema.safeParse({
      items: [{ productId: "product-003", quantity: 1 }],
      paymentMethod: "on_account",
    });
    expect(invalidOnAccountWithoutCustomer.success).toBe(false);

    const unsupportedPaymentMethod = createSaleDTOSchema.safeParse({
      items: [{ productId: "product-004", quantity: 1 }],
      paymentMethod: "card",
    });
    expect(unsupportedPaymentMethod.success).toBe(false);

    const validStockExamples = [
      {
        productId: "product-005",
        movementType: "inbound",
        quantity: 10,
        unitCost: 2500,
      },
      {
        productId: "product-005",
        movementType: "outbound",
        quantity: 2,
      },
    ];

    validStockExamples.forEach((example) => {
      const result = createStockMovementDTOSchema.safeParse(example);
      expect(result.success).toBe(true);
    });

    const invalidInboundWithoutUnitCost = createStockMovementDTOSchema.safeParse({
      productId: "product-006",
      movementType: "inbound",
      quantity: 1,
    });
    expect(invalidInboundWithoutUnitCost.success).toBe(false);

    const validStockMovementResponse = stockMovementResponseDTOSchema.safeParse({
      movementId: "mov-001",
      productId: "product-005",
      movementType: "inbound",
      quantity: 10,
      unitCost: 2500,
      occurredAt: "2026-02-27T12:10:00.000Z",
      stockOnHandAfter: 10,
      weightedAverageUnitCostAfter: 2500,
      inventoryValueAfter: 25000,
    });
    expect(validStockMovementResponse.success).toBe(true);

    const validStockHistoryResponse = listStockMovementsResponseDTOSchema.safeParse({
      items: [
        {
          movementId: "mov-001",
          productId: "product-005",
          movementType: "inbound",
          quantity: 10,
          unitCost: 2500,
          occurredAt: "2026-02-27T12:10:00.000Z",
          stockOnHandAfter: 10,
          weightedAverageUnitCostAfter: 2500,
          inventoryValueAfter: 25000,
        },
      ],
    });
    expect(validStockHistoryResponse.success).toBe(true);

    const validDebtPayment = createDebtPaymentDTOSchema.safeParse({
      customerId: "customer-001",
      amount: 3000,
      paymentMethod: "cash",
    });
    expect(validDebtPayment.success).toBe(true);

    const validDebtPaymentResponse = debtPaymentResponseDTOSchema.safeParse({
      paymentId: "payment-001",
      customerId: "customer-001",
      amount: 3000,
      createdAt: "2026-02-27T12:15:00.000Z",
    });
    expect(validDebtPaymentResponse.success).toBe(true);

    const validCustomerDebtSummary = customerDebtSummaryResponseDTOSchema.safeParse({
      customerId: "customer-001",
      outstandingBalance: 1000,
      ledger: [
        {
          entryId: "entry-001",
          entryType: "debt",
          orderId: "sale-001",
          amount: 3000,
          occurredAt: "2026-02-27T12:00:00.000Z",
        },
        {
          entryId: "entry-002",
          entryType: "payment",
          amount: 2000,
          occurredAt: "2026-02-27T12:10:00.000Z",
        },
      ],
    });
    expect(validCustomerDebtSummary.success).toBe(true);

    const validCreateProduct = createProductDTOSchema.safeParse({
      name: "Product Example",
      categoryId: "snack",
      price: 10,
      initialStock: 3,
    });
    expect(validCreateProduct.success).toBe(true);

    const validBulkPriceUpdate = bulkPriceUpdateDTOSchema.safeParse({
      scope: { type: "category", categoryId: "snack" },
      mode: "percentage",
      value: 10,
      previewOnly: true,
    });
    expect(validBulkPriceUpdate.success).toBe(true);

    const validSyncBatch = syncEventsBatchDTOSchema.safeParse({
      events: [
        {
          eventId: "evt-001",
          eventType: "sale_created",
          occurredAt: "2026-02-27T12:00:00.000Z",
          payload: { saleId: "sale-001" },
          idempotencyKey: "idem-evt-001",
        },
      ],
    });
    expect(validSyncBatch.success).toBe(true);
  });

  test("validates mocked API fixtures against response schemas", () => {
    expect(saleResponseDTOSchema.safeParse(saleCashSuccessFixture).success).toBe(true);
    expect(saleResponseDTOSchema.safeParse(saleOnAccountSuccessFixture).success).toBe(
      true,
    );

    expect(
      apiErrorResponseSchema.safeParse(saleOnAccountMissingCustomerErrorFixture).success,
    ).toBe(true);
    expect(apiErrorResponseSchema.safeParse(saleUnsupportedMethodErrorFixture).success).toBe(
      true,
    );
  });
});
