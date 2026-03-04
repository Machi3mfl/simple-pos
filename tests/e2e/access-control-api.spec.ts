import { expect, test } from "@playwright/test";
import { z } from "zod";

import { meResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/me-response.dto";

const apiErrorResponseSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

test.describe("access control api", () => {
  test("exposes current actor snapshot and enforces permissions on critical routes", async ({
    request,
  }) => {
    const defaultMeResponse = await request.get("/api/v1/me");
    expect(defaultMeResponse.status()).toBe(200);
    const defaultMeBody = await defaultMeResponse.json();
    const defaultMe = meResponseDTOSchema.parse(defaultMeBody);
    expect(defaultMe.actor.displayName.length).toBeGreaterThan(0);
    expect(defaultMe.permissionSnapshot.navigation.cashRegister).toBe(true);

    const switchToCashierResponse = await request.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_cashier_putri",
      },
    });
    expect(switchToCashierResponse.status()).toBe(200);

    const cashierMeResponse = await request.get("/api/v1/me");
    expect(cashierMeResponse.status()).toBe(200);
    const cashierMe = meResponseDTOSchema.parse(await cashierMeResponse.json());
    expect(cashierMe.actor.roleCodes).toContain("cashier");
    expect(cashierMe.permissionSnapshot.workspaces.products.canView).toBe(false);
    expect(cashierMe.permissionSnapshot.workspaces.receivables.canView).toBe(false);
    expect(cashierMe.permissionSnapshot.workspaces.sales.canViewSaleDetail).toBe(false);

    const cashierProductsImportResponse = await request.post("/api/v1/products/import", {
      data: {
        items: [],
      },
    });
    expect(cashierProductsImportResponse.status()).toBe(403);
    expect(
      apiErrorResponseSchema.safeParse(await cashierProductsImportResponse.json()).success,
    ).toBe(true);

    const cashierProfitSummaryResponse = await request.get("/api/v1/reports/profit-summary");
    expect(cashierProfitSummaryResponse.status()).toBe(403);

    const switchToSupervisorResponse = await request.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_supervisor_bruno",
      },
    });
    expect(switchToSupervisorResponse.status()).toBe(200);

    const supervisorMeResponse = await request.get("/api/v1/me");
    expect(supervisorMeResponse.status()).toBe(200);
    const supervisorMe = meResponseDTOSchema.parse(await supervisorMeResponse.json());
    expect(supervisorMe.actor.roleCodes).toContain("shift_supervisor");
    expect(supervisorMe.permissionSnapshot.workspaces.reporting.canView).toBe(true);
    expect(supervisorMe.permissionSnapshot.workspaces.reporting.canViewMargin).toBe(false);
    expect(supervisorMe.permissionSnapshot.workspaces.sales.canViewSaleDetail).toBe(true);

    const supervisorTopProductsResponse = await request.get("/api/v1/reports/top-products");
    expect(supervisorTopProductsResponse.status()).toBe(200);

    const supervisorProfitSummaryResponse = await request.get(
      "/api/v1/reports/profit-summary",
    );
    expect(supervisorProfitSummaryResponse.status()).toBe(403);

    const switchToCatalogManagerResponse = await request.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_catalog_lucia",
      },
    });
    expect(switchToCatalogManagerResponse.status()).toBe(200);

    const catalogManagerMeResponse = await request.get("/api/v1/me");
    expect(catalogManagerMeResponse.status()).toBe(200);
    const catalogManagerMe = meResponseDTOSchema.parse(await catalogManagerMeResponse.json());
    expect(catalogManagerMe.actor.roleCodes).toContain("catalog_manager");
    expect(catalogManagerMe.permissionSnapshot.workspaces.products.canView).toBe(true);
    expect(catalogManagerMe.permissionSnapshot.workspaces.cashRegister.canView).toBe(false);

    const catalogManagerReceivablesResponse = await request.get("/api/v1/receivables");
    expect(catalogManagerReceivablesResponse.status()).toBe(403);
    expect(
      apiErrorResponseSchema.safeParse(await catalogManagerReceivablesResponse.json()).success,
    ).toBe(true);
  });
});
