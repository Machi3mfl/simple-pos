import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";

import { createAccountsReceivableRuntime } from "@/modules/accounts-receivable/infrastructure/runtime/accountsReceivableRuntime";
import { receivablesSnapshotResponseDTOSchema } from "@/modules/accounts-receivable/presentation/dtos/receivables-snapshot-response.dto";

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

export async function GET(): Promise<Response> {
  noStore();
  const { listReceivablesSnapshotUseCase } = createAccountsReceivableRuntime();

  try {
    const result = await listReceivablesSnapshotUseCase.execute();
    const responseBody = {
      items: result,
    };

    const parsedResponse = receivablesSnapshotResponseDTOSchema.safeParse(responseBody);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta viola el contrato del snapshot de deudas.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch {
    return errorResponse(500, {
      code: "internal_error",
      message: "Ocurrió un error inesperado al obtener el snapshot de deudas.",
    });
  }
}
