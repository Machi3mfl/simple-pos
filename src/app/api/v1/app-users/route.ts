import { NextRequest, NextResponse } from "next/server";

import { fallbackActorAccessRecords } from "@/modules/access-control/infrastructure/fallback/fallbackActors";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import { resolveSupportBridgeAccess } from "@/modules/access-control/infrastructure/runtime/supportBridgeAccess";
import { selectableActorsResponseDTOSchema } from "@/modules/access-control/presentation/dtos/app-user-response.dto";

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
  const bridgeAccess = await resolveSupportBridgeAccess(request);
  if (!bridgeAccess.bridgeEnabled || !bridgeAccess.canManageBridge) {
    return errorResponse(403, {
      code: "forbidden",
      message:
        "Solo el modo soporte con permiso explícito puede listar operadores disponibles.",
    });
  }

  const url = new URL(request.url);
  const roleFilter = url.searchParams.get("role")?.trim();

  try {
    const { listSelectableActorsUseCase } = createAccessControlRuntime();
    const actors = await listSelectableActorsUseCase.execute();
    const filteredActors =
      roleFilter && roleFilter.length > 0
        ? actors.filter((actor) => actor.roleCodes.includes(roleFilter))
        : actors;

    const responseBody = { items: filteredActors };
    const parsed = selectableActorsResponseDTOSchema.safeParse(responseBody);
    if (!parsed.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta del listado de operadores viola el contrato.",
      });
    }

    return NextResponse.json(parsed.data, { status: 200 });
  } catch {
    const fallbackItems = fallbackActorAccessRecords
      .map((actor) => ({
        actorId: actor.user.getId(),
        displayName: actor.user.getDisplayName(),
        roleCodes: actor.roleCodes,
        roleNames: actor.roleNames,
        assignedRegisterIds: actor.assignedRegisterIds,
      }))
      .filter((actor) =>
        roleFilter && roleFilter.length > 0
          ? actor.roleCodes.includes(roleFilter)
          : true,
      );

    const responseBody = { items: fallbackItems };
    const parsed = selectableActorsResponseDTOSchema.safeParse(responseBody);
    if (!parsed.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta fallback del listado de operadores viola el contrato.",
      });
    }

    return NextResponse.json(parsed.data, { status: 200 });
  }
}
