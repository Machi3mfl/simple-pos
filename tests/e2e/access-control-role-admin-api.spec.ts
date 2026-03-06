import { expect, test } from "./support/test";

import {
  accessControlCashRegisterDTOSchema,
  accessControlRoleDTOSchema,
  accessControlWorkspaceResponseDTOSchema,
} from "../../src/modules/access-control/presentation/dtos/access-control-workspace-response.dto";
import { meResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/me-response.dto";

test.describe("access control role administration api", () => {
  test("system admin can create a custom role, assign it, and observe the resulting snapshot", async ({
    supportRequest,
  }) => {
    const meAsAdminResponse = await supportRequest.get("/api/v1/me");
    const meAsAdmin = meResponseDTOSchema.parse(await meAsAdminResponse.json());
    expect(meAsAdmin.permissionSnapshot.workspaces.usersAdmin.canView).toBe(true);
    expect(meAsAdmin.permissionSnapshot.workspaces.usersAdmin.canManageRoles).toBe(true);

    const workspaceResponse = await supportRequest.get("/api/v1/access-control/workspace");
    expect(workspaceResponse.status()).toBe(200);
    const workspace = accessControlWorkspaceResponseDTOSchema.parse(
      await workspaceResponse.json(),
    );
    expect(workspace.roles.some((role) => role.code === "cashier")).toBe(true);
    expect(workspace.permissionGroups.length).toBeGreaterThan(0);
    expect(workspace.cashRegisters.length).toBeGreaterThan(0);

    const originalMarta = workspace.users.find(
      (user) => user.userId === "user_collections_marta",
    );
    expect(originalMarta).toBeDefined();
    const originalMartaRegisterIds = originalMarta?.assignedRegisterIds ?? [];

    const uniqueName = `Caja extendida ${Date.now()}`;
    const createRoleResponse = await supportRequest.post("/api/v1/access-control/roles", {
      data: {
        name: uniqueName,
        description: "Rol custom para probar el composer.",
        clonedFromRoleId: "cashier",
        permissionCodes: [
          "checkout.sale.create",
          "cash.session.open",
          "cash.session.close",
          "sales_history.view",
          "sync.view",
        ],
      },
    });
    expect(createRoleResponse.status()).toBe(201);
    const createdRole = accessControlRoleDTOSchema.parse(await createRoleResponse.json());
    expect(createdRole.isLocked).toBe(false);
    expect(createdRole.name).toBe(uniqueName);

    const uniqueRegisterName = `Caja soporte ${Date.now()}`;
    const createRegisterResponse = await supportRequest.post(
      "/api/v1/access-control/cash-registers",
      {
        data: {
          name: uniqueRegisterName,
          locationCode: "accesos-admin",
        },
      },
    );
    expect(createRegisterResponse.status()).toBe(201);
    const createdRegister = accessControlCashRegisterDTOSchema.parse(
      await createRegisterResponse.json(),
    );
    expect(createdRegister.name).toBe(uniqueRegisterName);
    expect(createdRegister.isActive).toBe(true);

    const updateRegisterResponse = await supportRequest.put(
      `/api/v1/access-control/cash-registers/${createdRegister.id}`,
      {
        data: {
          name: `${uniqueRegisterName} v2`,
          locationCode: "accesos-admin-2",
          isActive: true,
        },
      },
    );
    expect(updateRegisterResponse.status()).toBe(200);
    const updatedRegister = accessControlCashRegisterDTOSchema.parse(
      await updateRegisterResponse.json(),
    );
    expect(updatedRegister.name).toContain("v2");

    const assignRoleResponse = await supportRequest.put(
      "/api/v1/access-control/users/user_collections_marta/roles",
      {
        data: {
          roleIds: ["collections_clerk", createdRole.id],
        },
      },
    );
    expect(assignRoleResponse.status()).toBe(200);

    const assignRegisterResponse = await supportRequest.put(
      "/api/v1/access-control/users/user_collections_marta/cash-registers",
      {
        data: {
          cashRegisterIds: Array.from(
            new Set([...originalMartaRegisterIds, createdRegister.id]),
          ),
        },
      },
    );
    expect(assignRegisterResponse.status()).toBe(200);

    const assumeCollectionsResponse = await supportRequest.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_collections_marta",
      },
    });
    expect(assumeCollectionsResponse.status()).toBe(200);

    const meAsCollectionsResponse = await supportRequest.get("/api/v1/me");
    const meAsCollections = meResponseDTOSchema.parse(
      await meAsCollectionsResponse.json(),
    );
    expect(meAsCollections.actor.roleNames).toContain(uniqueName);
    expect(meAsCollections.actor.assignedRegisterIds).toContain(createdRegister.id);
    expect(meAsCollections.permissionSnapshot.workspaces.cashRegister.canView).toBe(true);
    expect(meAsCollections.permissionSnapshot.workspaces.receivables.canView).toBe(true);

    const assumeAdminAgainResponse = await supportRequest.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_admin_soporte",
      },
    });
    expect(assumeAdminAgainResponse.status()).toBe(200);

    const restoreAssignmentsResponse = await supportRequest.put(
      "/api/v1/access-control/users/user_collections_marta/roles",
      {
        data: {
          roleIds: ["collections_clerk"],
        },
      },
    );
    expect(restoreAssignmentsResponse.status()).toBe(200);

    const restoreRegisterAssignmentsResponse = await supportRequest.put(
      "/api/v1/access-control/users/user_collections_marta/cash-registers",
      {
        data: {
          cashRegisterIds: originalMartaRegisterIds,
        },
      },
    );
    expect(restoreRegisterAssignmentsResponse.status()).toBe(200);

    const deleteRoleResponse = await supportRequest.delete(
      `/api/v1/access-control/roles/${createdRole.id}`,
    );
    expect(deleteRoleResponse.status()).toBe(200);
  });
});
