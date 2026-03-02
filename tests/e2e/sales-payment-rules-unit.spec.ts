import { expect, test } from "@playwright/test";

import { Sale } from "../../src/modules/sales/domain/entities/Sale";
import { SaleCustomerRequiredError } from "../../src/modules/sales/domain/errors/SaleDomainError";
import { createSaleDTOSchema } from "../../src/modules/sales/presentation/dtos/create-sale.dto";

test.describe("sales payment rules (unit)", () => {
  test("dto rejects on_account payload without customer reference", () => {
    const parsed = createSaleDTOSchema.safeParse({
      items: [{ productId: "prod-001", quantity: 1 }],
      paymentMethod: "on_account",
    });

    expect(parsed.success).toBeFalsy();
    if (!parsed.success) {
      expect(
        parsed.error.issues.some(
          (issue) =>
            issue.path.join(".") === "customerId" &&
            issue.message.includes("customerId o customerName es obligatorio"),
        ),
      ).toBeTruthy();
    }
  });

  test("dto accepts on_account payload when customerName is present", () => {
    const parsed = createSaleDTOSchema.safeParse({
      items: [{ productId: "prod-001", quantity: 1 }],
      paymentMethod: "on_account",
      customerName: "Cliente Test",
      initialPaymentAmount: 4,
    });

    expect(parsed.success).toBeTruthy();
  });

  test("dto rejects initialPaymentAmount for cash payloads", () => {
    const parsed = createSaleDTOSchema.safeParse({
      items: [{ productId: "prod-001", quantity: 1 }],
      paymentMethod: "cash",
      initialPaymentAmount: 4,
    });

    expect(parsed.success).toBeFalsy();
  });

  test("sale entity enforces customer assignment for on_account", () => {
    const sale = Sale.create({
      id: "sale-on-account",
      items: [{ productId: "prod-001", quantity: 1, unitPrice: 10 }],
      paymentMethod: "on_account",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(() => sale.ensureCheckoutRules()).toThrow(SaleCustomerRequiredError);

    sale.assignCustomer("cust-001");
    expect(() => sale.ensureCheckoutRules()).not.toThrow();
  });

  test("sale entity allows cash checkout without customer", () => {
    const sale = Sale.create({
      id: "sale-cash",
      items: [{ productId: "prod-001", quantity: 1, unitPrice: 10 }],
      paymentMethod: "cash",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(() => sale.ensureCheckoutRules()).not.toThrow();
  });
});
