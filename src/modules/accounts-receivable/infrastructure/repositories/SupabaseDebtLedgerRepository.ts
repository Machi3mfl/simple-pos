import type { SupabaseClient } from "@supabase/supabase-js";

import { DebtLedgerEntry } from "../../domain/entities/DebtLedgerEntry";
import type {
  DebtLedgerFilters,
  DebtLedgerRepository,
} from "../../domain/repositories/DebtLedgerRepository";

interface DebtLedgerRow {
  id: string;
  customer_id: string;
  entry_type: "debt" | "payment";
  order_id: string | null;
  amount: number | string;
  occurred_at: string;
  notes: string | null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error("Invalid numeric value in Supabase debt ledger row.");
}

function mapRowToEntry(row: DebtLedgerRow): DebtLedgerEntry {
  if (row.entry_type === "debt") {
    if (!row.order_id) {
      throw new Error("Invalid debt ledger row: debt entry requires order_id.");
    }

    return DebtLedgerEntry.recordDebt({
      id: row.id,
      customerId: row.customer_id,
      amount: toNumber(row.amount),
      occurredAt: new Date(row.occurred_at),
      orderId: row.order_id,
    });
  }

  return DebtLedgerEntry.recordPayment({
    id: row.id,
    customerId: row.customer_id,
    amount: toNumber(row.amount),
    occurredAt: new Date(row.occurred_at),
    orderId: row.order_id ?? undefined,
    notes: row.notes ?? undefined,
  });
}

export class SupabaseDebtLedgerRepository implements DebtLedgerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async append(entry: DebtLedgerEntry): Promise<void> {
    const primitive = entry.toPrimitives();
    const { error } = await this.client.from("debt_ledger").insert({
      id: primitive.entryId,
      customer_id: primitive.customerId,
      entry_type: primitive.entryType,
      order_id: primitive.orderId ?? null,
      amount: primitive.amount,
      occurred_at: primitive.occurredAt,
      notes: primitive.notes ?? null,
    });

    if (error) {
      throw new Error(`Failed to append debt ledger entry in Supabase: ${error.message}`);
    }
  }

  async listByCustomer(
    customerId: string,
    filters: DebtLedgerFilters = {},
  ): Promise<readonly DebtLedgerEntry[]> {
    let query = this.client
      .from("debt_ledger")
      .select("*")
      .eq("customer_id", customerId);

    if (filters.periodStart) {
      query = query.gte("occurred_at", filters.periodStart.toISOString());
    }

    if (filters.periodEnd) {
      query = query.lte("occurred_at", filters.periodEnd.toISOString());
    }

    const { data, error } = await query.order("occurred_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to list debt ledger entries from Supabase: ${error.message}`);
    }

    return (data ?? []).map((row) => mapRowToEntry(row as DebtLedgerRow));
  }
}
