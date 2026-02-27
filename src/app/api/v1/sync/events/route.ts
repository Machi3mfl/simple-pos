import { NextResponse } from "next/server";

import { syncEventsBatchDTOSchema } from "@/modules/sync/presentation/dtos/sync-events-batch.dto";
import { syncEventsResultResponseDTOSchema } from "@/modules/sync/presentation/dtos/sync-events-result.dto";

interface ApiErrorDetail {
  readonly field: string;
  readonly message: string;
}

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: ApiErrorDetail[];
}

const SUPPORTED_EVENT_TYPES = new Set([
  "sale_created",
  "stock_movement_created",
  "debt_payment_registered",
]);

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
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

  const seenIdempotencyKeys = new Set<string>();
  const results = parsedRequest.data.events.map((event) => {
    if (seenIdempotencyKeys.has(event.idempotencyKey)) {
      return {
        eventId: event.eventId,
        status: "failed" as const,
        reason: "duplicate_idempotency_key_in_batch",
      };
    }
    seenIdempotencyKeys.add(event.idempotencyKey);

    if (!SUPPORTED_EVENT_TYPES.has(event.eventType)) {
      return {
        eventId: event.eventId,
        status: "failed" as const,
        reason: "unsupported_event_type",
      };
    }

    return {
      eventId: event.eventId,
      status: "synced" as const,
    };
  });

  const responseBody = { results };
  const parsedResponse = syncEventsResultResponseDTOSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    return errorResponse(500, {
      code: "mock_contract_error",
      message: "Mock response violates sync result contract.",
    });
  }

  return NextResponse.json(parsedResponse.data, { status: 200 });
}
