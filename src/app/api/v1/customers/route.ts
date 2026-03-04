import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/infrastructure/config/supabaseServer";
import {
  actorHasAnyPermission,
  forbiddenPermissionResponse,
  resolveActorSnapshotForRequest,
} from "@/modules/access-control/infrastructure/runtime/requestAuthorization";
import { SearchCustomersUseCase } from "@/modules/customers/application/use-cases/SearchCustomersUseCase";
import type { CustomerRepository } from "@/modules/customers/domain/repositories/CustomerRepository";
import { SupabaseCustomerRepository } from "@/modules/customers/infrastructure/repositories/SupabaseCustomerRepository";
import type { CustomerSearchResponseDTO } from "@/modules/customers/presentation/dtos/customer-search-response.dto";

export const dynamic = "force-dynamic";

function createCustomersRuntime(): {
  searchCustomersUseCase: SearchCustomersUseCase;
} {
  const customerRepository: CustomerRepository = new SupabaseCustomerRepository(
    getSupabaseServerClient(),
  );

  return {
    searchCustomersUseCase: new SearchCustomersUseCase(customerRepository),
  };
}

function parseLimit(rawValue: string | null): number | undefined {
  if (!rawValue) {
    return undefined;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}

export async function GET(request: NextRequest): Promise<Response> {
  const actorSnapshot = await resolveActorSnapshotForRequest(request);
  if (
    !actorHasAnyPermission(actorSnapshot, [
      "checkout.sale.create",
      "receivables.view",
    ])
  ) {
    return forbiddenPermissionResponse(
      "El operador actual no tiene permiso para consultar clientes.",
    );
  }

  const { searchCustomersUseCase } = createCustomersRuntime();
  const url = new URL(request.url);
  const query = url.searchParams.get("query") ?? undefined;
  const limit = parseLimit(url.searchParams.get("limit"));

  const customers = await searchCustomersUseCase.execute({
    query,
    limit,
  });

  const responseBody: CustomerSearchResponseDTO = {
    items: customers.map((customer) => ({
      id: customer.getId(),
      name: customer.getName(),
      createdAt: customer.getCreatedAt().toISOString(),
    })),
  };

  return NextResponse.json(responseBody, { status: 200 });
}
