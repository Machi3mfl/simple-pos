import { unstable_noStore as noStore } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createCashManagementRuntime } from "@/modules/cash-management/infrastructure/runtime/cashManagementRuntime";
import { listCashRegistersResponseDTOSchema } from "@/modules/cash-management/presentation/dtos/list-cash-registers-response.dto";

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
  noStore();
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorSnapshot.permissionSnapshot.workspaces.cashRegister.canView) {
    return errorResponse(403, {
      code: "forbidden",
      message: "El operador actual no tiene permiso para consultar cajas.",
    });
  }

  const { listAccessibleCashRegistersUseCase } = createCashManagementRuntime();
  const items = await listAccessibleCashRegistersUseCase.execute({
    accessibleRegisterIds: actorSnapshot.actor.assignedRegisterIds,
  });

  const parsedResponse = listCashRegistersResponseDTOSchema.safeParse({ items });
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "La respuesta de cajas viola el contrato.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
