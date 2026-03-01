import { NextResponse } from "next/server";

import { createSyncRuntime } from "@/modules/sync/infrastructure/runtime/syncRuntime";
import { syncEventsBatchDTOSchema } from "@/modules/sync/presentation/dtos/sync-events-batch.dto";
import { syncEventsResultResponseDTOSchema } from "@/modules/sync/presentation/dtos/sync-events-result.dto";

export const dynamic = "force-dynamic";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: ApiErrorDetail[];
}
function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  const { processSyncEventsBatchUseCase } = createSyncRuntime();
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "Request body must be valid JSON.",
    });
  }

  const parsedRequest = syncEventsBatchDTOSchema.safeParse(payload);
  if (!parsedRequest.success) {
    const details = parsedRequest.error.issues.map((issue) => ({
      field: issue.path.join(".") || "body",
      message: issue.message,
    }));

    return errorResponse(400, {
      code: "validation_error",
      message: "Sync batch payload validation failed.",
      details,
    });
  }

  const results = await processSyncEventsBatchUseCase.execute(parsedRequest.data);

  const responseBody = { results };
  const parsedResponse = syncEventsResultResponseDTOSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "response_contract_error",
      message: "Response violates sync result contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
