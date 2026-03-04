import { NextRequest, NextResponse } from "next/server";

import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { createAccessControlRuntime } from "@/modules/access-control/infrastructure/runtime/accessControlRuntime";
import {
  upsertUserAuthCredentialsRequestDTOSchema,
  userAuthCredentialsResponseDTOSchema,
} from "@/modules/access-control/presentation/dtos/upsert-user-auth-credentials.dto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: readonly {
    readonly field: string;
    readonly message: string;
  }[];
}

function errorResponse(
  status: number,
  body: ApiErrorResponse,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(body, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { readonly params: { readonly id: string } },
): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (!actorHasAnyPermission(actorSnapshot, ["users.manage"])) {
    return forbiddenPermissionResponse(
      "Tu perfil no tiene permisos para provisionar accesos reales.",
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, {
      code: "invalid_json",
      message: "El body debe ser JSON válido.",
    });
  }

  const parsedBody = upsertUserAuthCredentialsRequestDTOSchema.safeParse(payload);
  if (!parsedBody.success) {
    return errorResponse(400, {
      code: "validation_error",
      message: "Las credenciales del usuario son inválidas.",
      details: parsedBody.error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
  }

  try {
    const { upsertUserAuthCredentialsUseCase } = createAccessControlRuntime();
    const result = await upsertUserAuthCredentialsUseCase.execute({
      actorId: actorSnapshot.actor.actorId,
      userId: params.id,
      email: parsedBody.data.email,
      password: parsedBody.data.password,
    });

    const parsedResponse = userAuthCredentialsResponseDTOSchema.safeParse(result);
    if (!parsedResponse.success) {
      return errorResponse(500, {
        code: "response_contract_error",
        message: "La respuesta de provisión de credenciales viola el contrato.",
      });
    }

    return NextResponse.json(parsedResponse.data, { status: 200 });
  } catch (error: unknown) {
    return errorResponse(400, {
      code: "user_auth_credentials_failed",
      message:
        error instanceof Error
          ? error.message
          : "No se pudieron guardar las credenciales del usuario.",
    });
  }
}
