import { expect, test } from "./support/test";

import { meResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/me-response.dto";
import { userAuthCredentialsResponseDTOSchema } from "../../src/modules/access-control/presentation/dtos/upsert-user-auth-credentials.dto";
import {
  deleteAuthUserById,
  readAppUserAuthLink,
  restoreAppUserAuthLink,
  signInWithPassword,
} from "./support/access-control-auth";

test.describe("access control credential administration api", () => {
  test("system admin can provision real credentials for an application user and login with them", async ({
    supportRequest,
  }) => {
    const targetUserId = "user_exec_ana";
    const authLinkSnapshot = await readAppUserAuthLink(targetUserId);
    let createdAuthUserId: string | null = null;

    try {
      const email = `ana-access-${Date.now()}@example.com`;
      const password = `Ana-${Date.now()}Aa!`;
      const provisionResponse = await supportRequest.post(
        `/api/v1/access-control/users/${targetUserId}/auth-credentials`,
        {
          data: {
            email,
            password,
          },
        },
      );

      expect(provisionResponse.status()).toBe(200);
      const provisionedCredentials = userAuthCredentialsResponseDTOSchema.parse(
        await provisionResponse.json(),
      );
      expect(provisionedCredentials.userId).toBe(targetUserId);
      expect(provisionedCredentials.authEmail).toBe(email);
      createdAuthUserId = provisionedCredentials.authUserId;

      const signedInSession = await signInWithPassword({
        email,
        password,
      });
      expect(signedInSession.authUserId).toBe(provisionedCredentials.authUserId);

      const meAsProvisionedUserResponse = await supportRequest.get("/api/v1/me", {
        headers: {
          authorization: `Bearer ${signedInSession.accessToken}`,
        },
      });
      expect(meAsProvisionedUserResponse.status()).toBe(200);

      const meAsProvisionedUser = meResponseDTOSchema.parse(
        await meAsProvisionedUserResponse.json(),
      );
      expect(meAsProvisionedUser.actor.actorId).toBe(targetUserId);
      expect(meAsProvisionedUser.actor.displayName).toBe("Ana");
      expect(meAsProvisionedUser.session.resolutionSource).toBe("authenticated");
      expect(meAsProvisionedUser.permissionSnapshot.workspaces.reporting.canView).toBe(
        true,
      );
    } finally {
      await restoreAppUserAuthLink(authLinkSnapshot);
      if (createdAuthUserId && createdAuthUserId !== authLinkSnapshot.authUserId) {
        await deleteAuthUserById(createdAuthUserId);
      }
    }
  });
});
