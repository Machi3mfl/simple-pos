import { expect, test } from "./support/test";
import { z } from "zod";

import { meResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/me-response.dto";
import {
  assumeActorViaSupportBridge,
  createAuthenticatedSessionForAppUser,
} from "./support/access-control-auth";

const apiErrorResponseSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

test.describe("access control api", () => {
  test("exposes current actor snapshot and enforces permissions on critical routes", async ({
    anonymousRequest,
    supportRequest,
  }) => {
    const defaultMeResponse = await anonymousRequest.get("/api/v1/me");
    expect(defaultMeResponse.status()).toBe(200);
    const defaultMeBody = await defaultMeResponse.json();
    const defaultMe = meResponseDTOSchema.parse(defaultMeBody);
    expect(defaultMe.actor.displayName.length).toBeGreaterThan(0);
    expect(defaultMe.permissionSnapshot.navigation.cashRegister).toBe(false);
    expect(defaultMe.session.resolutionSource).toBe("default_actor");
    expect(defaultMe.session.canAssumeUserBridge).toBe(true);
    expect(defaultMe.session.supportControllerActorId).toBeUndefined();

    const appUsersWithoutSupportResponse = await anonymousRequest.get("/api/v1/app-users");
    expect(appUsersWithoutSupportResponse.status()).toBe(403);

    await assumeActorViaSupportBridge(supportRequest, "user_cashier_putri");

    const cashierMeResponse = await supportRequest.get("/api/v1/me");
    expect(cashierMeResponse.status()).toBe(200);
    const cashierMe = meResponseDTOSchema.parse(await cashierMeResponse.json());
    expect(cashierMe.actor.roleCodes).toContain("cashier");
    expect(cashierMe.session.resolutionSource).toBe("assumed_user");
    expect(cashierMe.session.supportControllerActorId).toBe("user_admin_soporte");
    expect(cashierMe.permissionSnapshot.workspaces.products.canView).toBe(false);
    expect(cashierMe.permissionSnapshot.workspaces.receivables.canView).toBe(false);
    expect(cashierMe.permissionSnapshot.workspaces.sales.canViewSaleDetail).toBe(false);
    expect(
      cashierMe.permissionSnapshot.workspaces.cashRegister.canRecordManualCashMovement,
    ).toBe(false);
    expect(
      cashierMe.permissionSnapshot.workspaces.cashRegister.canBackdateSessionOpen,
    ).toBe(false);
    expect(
      cashierMe.permissionSnapshot.workspaces.cashRegister.canApproveDiscrepancyClose,
    ).toBe(false);

    const cashierProductsImportResponse = await supportRequest.post("/api/v1/products/import", {
      data: {
        items: [],
      },
    });
    expect(cashierProductsImportResponse.status()).toBe(403);
    expect(
      apiErrorResponseSchema.safeParse(await cashierProductsImportResponse.json()).success,
    ).toBe(true);

    const cashierProfitSummaryResponse = await supportRequest.get("/api/v1/reports/profit-summary");
    expect(cashierProfitSummaryResponse.status()).toBe(403);

    await assumeActorViaSupportBridge(supportRequest, "user_supervisor_bruno");

    const supervisorMeResponse = await supportRequest.get("/api/v1/me");
    expect(supervisorMeResponse.status()).toBe(200);
    const supervisorMe = meResponseDTOSchema.parse(await supervisorMeResponse.json());
    expect(supervisorMe.actor.roleCodes).toContain("shift_supervisor");
    expect(supervisorMe.session.resolutionSource).toBe("assumed_user");
    expect(supervisorMe.permissionSnapshot.workspaces.reporting.canView).toBe(true);
    expect(supervisorMe.permissionSnapshot.workspaces.reporting.canViewMargin).toBe(false);
    expect(supervisorMe.permissionSnapshot.workspaces.sales.canViewSaleDetail).toBe(true);
    expect(
      supervisorMe.permissionSnapshot.workspaces.cashRegister.canRecordManualCashMovement,
    ).toBe(true);
    expect(
      supervisorMe.permissionSnapshot.workspaces.cashRegister.canBackdateSessionOpen,
    ).toBe(true);
    expect(
      supervisorMe.permissionSnapshot.workspaces.cashRegister
        .canApproveDiscrepancyClose,
    ).toBe(true);

    const supervisorTopProductsResponse = await supportRequest.get("/api/v1/reports/top-products");
    expect(supervisorTopProductsResponse.status()).toBe(200);

    const supervisorProfitSummaryResponse = await supportRequest.get(
      "/api/v1/reports/profit-summary",
    );
    expect(supervisorProfitSummaryResponse.status()).toBe(403);

    await assumeActorViaSupportBridge(supportRequest, "user_catalog_lucia");

    const catalogManagerMeResponse = await supportRequest.get("/api/v1/me");
    expect(catalogManagerMeResponse.status()).toBe(200);
    const catalogManagerMe = meResponseDTOSchema.parse(await catalogManagerMeResponse.json());
    expect(catalogManagerMe.actor.roleCodes).toContain("catalog_manager");
    expect(catalogManagerMe.session.resolutionSource).toBe("assumed_user");
    expect(catalogManagerMe.permissionSnapshot.workspaces.products.canView).toBe(true);
    expect(catalogManagerMe.permissionSnapshot.workspaces.cashRegister.canView).toBe(false);
    expect(
      catalogManagerMe.permissionSnapshot.workspaces.cashRegister
        .canBackdateSessionOpen,
    ).toBe(false);
    expect(
      catalogManagerMe.permissionSnapshot.workspaces.cashRegister
        .canApproveDiscrepancyClose,
    ).toBe(false);

    const catalogManagerReceivablesResponse = await supportRequest.get("/api/v1/receivables");
    expect(catalogManagerReceivablesResponse.status()).toBe(403);
    expect(
      apiErrorResponseSchema.safeParse(await catalogManagerReceivablesResponse.json()).success,
    ).toBe(true);
  });

  test("prefers authenticated auth_user_id mapping over assumed-user bridge", async ({
    supportRequest,
  }) => {
    const session = await createAuthenticatedSessionForAppUser({
      appUserId: "user_manager_maxi",
      label: "auth-manager",
    });

    try {
      await assumeActorViaSupportBridge(supportRequest, "user_cashier_putri");

      const meResponse = await supportRequest.get("/api/v1/me", {
        headers: {
          authorization: `Bearer ${session.accessToken}`,
        },
      });
      expect(meResponse.status()).toBe(200);

      const me = meResponseDTOSchema.parse(await meResponse.json());
      expect(me.actor.roleCodes).toContain("business_manager");
      expect(me.actor.roleCodes).not.toContain("cashier");
      expect(me.session.resolutionSource).toBe("authenticated");
      expect(me.session.authUserId).toBe(session.authUserId);
      expect(me.session.canAssumeUserBridge).toBe(true);
    } finally {
      await session.cleanup();
    }
  });
});
