import { NextRequest, NextResponse } from "next/server";

import { resolveActorSnapshotForRequest } from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { meResponseDTOSchema } from "@/modules/access-control/presentation/dtos/me-response.dto";

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
  try {
    const snapshot = await resolveActorSnapshotForRequest(request);

    const parsed = meResponseDTOSchema.safeParse(snapshot);
    if (!parsed.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta del perfil actual viola el contrato.",
      });
    }

    return NextResponse.json(parsed.data, { status: 200 });
  } catch {
    return errorResponse(500, {
      code: "internal_error",
      message: "No se pudo cargar el perfil actual.",
    });
  }
}
