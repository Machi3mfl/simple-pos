import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import { accessControlWorkspaceResponseDTOSchema } from "@/modules/access-control/presentation/dtos/access-control-workspace-response.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function GET(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (
    !actorHasAnyPermission(actorSnapshot, [
      "users.manage",
      "roles.assign",
      "roles.manage",
    ])
  ) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para abrir el catálogo de accesos.",
    );
  }

  try {
    const { getAccessControlWorkspaceSnapshotUseCase } = createAccessControlRuntime();
    const snapshot = await getAccessControlWorkspaceSnapshotUseCase.execute();
    const responseBody = {
      roles: snapshot.roles.map((role) => ({
        ...role,
        createdAt: role.createdAt.toISOString(),
        updatedAt: role.updatedAt.toISOString(),
      })),
      users: snapshot.users,
      cashRegisters: snapshot.cashRegisters,
      permissions: snapshot.permissions,
      permissionGroups: snapshot.permissionGroups,
    };
    const parsed = accessControlWorkspaceResponseDTOSchema.safeParse(responseBody);
    if (!parsed.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta del workspace de accesos viola el contrato.",
      });
    }

    return NextResponse.json(parsed.data, { status: 200 });
  } catch (error: unknown) {
    return errorResponse(500, {
      code: "internal_error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el workspace de accesos.",
    });
  }
}
