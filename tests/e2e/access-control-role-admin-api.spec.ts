import { expect, test } from "@playwright/test";

import { accessControlRoleDTOSchema, accessControlWorkspaceResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/access-control-workspace-response.dto";
import { meResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/me-response.dto";

test.describe("access control role administration api", () => {
  test("system admin can create a custom role, assign it, and observe the resulting snapshot", async ({
    request,
  }) => {
    const assumeAdminResponse = await request.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_admin_soporte",
      },
    });
    expect(assumeAdminResponse.status()).toBe(200);

    const meAsAdminResponse = await request.get("/api/v1/me");
    const meAsAdmin = meResponseDTOSchema.parse(await meAsAdminResponse.json());
    expect(meAsAdmin.permissionSnapshot.workspaces.usersAdmin.canView).toBe(true);
    expect(meAsAdmin.permissionSnapshot.workspaces.usersAdmin.canManageRoles).toBe(true);

    const workspaceResponse = await request.get("/api/v1/access-control/workspace");
    expect(workspaceResponse.status()).toBe(200);
    const workspace = accessControlWorkspaceResponseDTOSchema.parse(
      await workspaceResponse.json(),
    );
    expect(workspace.roles.some((role) => role.code === "cashier")).toBe(true);
    expect(workspace.permissionGroups.length).toBeGreaterThan(0);

    const uniqueName = `Caja extendida ${Date.now()}`;
    const createRoleResponse = await request.post("/api/v1/access-control/roles", {
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

    const assignRoleResponse = await request.put(
      "/api/v1/access-control/users/user_collections_marta/roles",
      {
        data: {
          roleIds: ["collections_clerk", createdRole.id],
        },
      },
    );
    expect(assignRoleResponse.status()).toBe(200);

    const assumeCollectionsResponse = await request.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_collections_marta",
      },
    });
    expect(assumeCollectionsResponse.status()).toBe(200);

    const meAsCollectionsResponse = await request.get("/api/v1/me");
    const meAsCollections = meResponseDTOSchema.parse(
      await meAsCollectionsResponse.json(),
    );
    expect(meAsCollections.actor.roleNames).toContain(uniqueName);
    expect(meAsCollections.permissionSnapshot.workspaces.cashRegister.canView).toBe(true);
    expect(meAsCollections.permissionSnapshot.workspaces.receivables.canView).toBe(true);

    const assumeAdminAgainResponse = await request.post("/api/v1/me/assume-user", {
      data: {
        userId: "user_admin_soporte",
      },
    });
    expect(assumeAdminAgainResponse.status()).toBe(200);

    const restoreAssignmentsResponse = await request.put(
      "/api/v1/access-control/users/user_collections_marta/roles",
      {
        data: {
          roleIds: ["collections_clerk"],
        },
      },
    );
    expect(restoreAssignmentsResponse.status()).toBe(200);

    const deleteRoleResponse = await request.delete(
      `/api/v1/access-control/roles/${createdRole.id}`,
    );
    expect(deleteRoleResponse.status()).toBe(200);
  });
});
