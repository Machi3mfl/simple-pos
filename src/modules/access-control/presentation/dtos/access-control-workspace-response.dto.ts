import { z } from "zod";

export const accessControlPermissionDTOSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    groupCode: z.string().min(1),
    groupLabel: z.string().min(1),
    groupDescription: z.string().min(1),
  })
  .strict();

export const accessControlPermissionGroupDTOSchema = z
  .object({
    code: z.string().min(1),
    label: z.string().min(1),
    description: z.string().min(1),
    permissionCodes: z.array(z.string().min(1)),
  })
  .strict();

export const accessControlRoleDTOSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    isSystem: z.boolean(),
    isLocked: z.boolean(),
    clonedFromRoleId: z.string().min(1).optional(),
    permissionCodes: z.array(z.string().min(1)),
    assignedUserCount: z.number().int().nonnegative(),
    createdAt: z.string().datetime(),
    createdByUserId: z.string().min(1).optional(),
    createdByDisplayName: z.string().min(1).optional(),
    updatedAt: z.string().datetime(),
    updatedByUserId: z.string().min(1).optional(),
    updatedByDisplayName: z.string().min(1).optional(),
  })
  .strict();

export const accessControlUserDTOSchema = z
  .object({
    userId: z.string().min(1),
    displayName: z.string().min(1),
    actorKind: z.enum(["human", "system"]),
    isActive: z.boolean(),
    roleIds: z.array(z.string().min(1)),
    roleCodes: z.array(z.string().min(1)),
    roleNames: z.array(z.string().min(1)),
    assignedRegisterIds: z.array(z.string().min(1)),
  })
  .strict();

export const accessControlWorkspaceResponseDTOSchema = z
  .object({
    roles: z.array(accessControlRoleDTOSchema),
    users: z.array(accessControlUserDTOSchema),
    permissions: z.array(accessControlPermissionDTOSchema),
    permissionGroups: z.array(accessControlPermissionGroupDTOSchema),
  })
  .strict();
