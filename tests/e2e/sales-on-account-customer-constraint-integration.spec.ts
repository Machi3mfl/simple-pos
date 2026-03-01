import { expect, test } from "@playwright/test";

test.describe("sales on-account customer constraint (integration)", () => {
  test.skip(
    process.env.POS_BACKEND_MODE === "supabase",
    "This suite validates integration behavior against mock runtime contracts.",
  );

  test("rejects on_account checkout when customerId/customerName are missing", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: "prod-on-account-constraint", quantity: 1 }],
        paymentMethod: "on_account",
      },
    });

    expect(response.status()).toBe(400);
    const payload = (await response.json()) as {
      readonly code: string;
      readonly message: string;
      readonly details?: ReadonlyArray<{ readonly field: string; readonly message: string }>;
    };

    expect(payload.code).toBe("validation_error");
    expect(payload.message).toContain("Sale payload validation failed");
    expect(
      payload.details?.some(
        (detail) =>
          detail.field === "customerId" &&
          detail.message.includes("customerId or customerName is required"),
      ),
    ).toBeTruthy();
  });

  test("accepts on_account checkout when customerName is provided", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/sales", {
      data: {
        items: [{ productId: "prod-on-account-constraint", quantity: 1 }],
        paymentMethod: "on_account",
        customerName: `Integration Customer ${Date.now()}`,
      },
    });

    expect(response.status()).toBe(201);
    const payload = (await response.json()) as {
      readonly saleId: string;
      readonly paymentMethod: "cash" | "on_account";
      readonly customerId?: string;
    };

    expect(payload.saleId.length).toBeGreaterThan(0);
    expect(payload.paymentMethod).toBe("on_account");
    expect(payload.customerId).toBeTruthy();
  });
});
