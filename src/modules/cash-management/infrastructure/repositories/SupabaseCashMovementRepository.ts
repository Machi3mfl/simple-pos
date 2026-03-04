import type { SupabaseClient } from "@supabase/supabase-js";

import { CashMovement } from "../../domain/entities/CashMovement";
import type { CashMovementRepository } from "../../domain/repositories/CashMovementRepository";

interface CashMovementRow {
  readonly id: string;
  readonly cash_register_session_id: string;
  readonly cash_register_id: string;
  readonly movement_type:
    | "opening_float"
    | "cash_sale"
    | "debt_payment_cash"
    | "cash_paid_in"
    | "cash_paid_out"
    | "safe_drop"
    | "refund_cash"
    | "adjustment";
  readonly direction: "inbound" | "outbound";
  readonly amount: number | string;
  readonly reason_code: string | null;
  readonly notes: string | null;
  readonly sale_id: string | null;
  readonly debt_ledger_entry_id: string | null;
  readonly occurred_at: string;
  readonly performed_by_user_id: string;
}

function parseNumeric(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export class SupabaseCashMovementRepository implements CashMovementRepository {
  constructor(private readonly client: SupabaseClient) {}

  async append(movement: CashMovement): Promise<void> {
    const primitives = movement.toPrimitives();
    const { error } = await this.client.from("cash_movements").insert({
      id: primitives.id,
      cash_register_session_id: primitives.cashRegisterSessionId,
      cash_register_id: primitives.cashRegisterId,
      movement_type: primitives.movementType,
      direction: primitives.direction,
      amount: primitives.amount,
      reason_code: primitives.reasonCode ?? null,
      notes: primitives.notes ?? null,
      sale_id: primitives.saleId ?? null,
      debt_ledger_entry_id: primitives.debtLedgerEntryId ?? null,
      occurred_at: primitives.occurredAt.toISOString(),
      performed_by_user_id: primitives.performedByUserId,
    });

    if (error) {
      throw new Error(`Failed to append cash movement in Supabase: ${error.message}`);
    }
  }

  async listBySessionId(sessionId: string): Promise<readonly CashMovement[]> {
    const { data, error } = await this.client
      .from("cash_movements")
      .select("*")
      .eq("cash_register_session_id", sessionId)
      .order("occurred_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list cash movements in Supabase: ${error.message}`);
    }

    return ((data as readonly CashMovementRow[] | null) ?? []).map((row) =>
      CashMovement.record({
        id: row.id,
        cashRegisterSessionId: row.cash_register_session_id,
        cashRegisterId: row.cash_register_id,
        movementType: row.movement_type,
        direction: row.direction,
        amount: parseNumeric(row.amount),
        reasonCode: row.reason_code ?? undefined,
        notes: row.notes ?? undefined,
        saleId: row.sale_id ?? undefined,
        debtLedgerEntryId: row.debt_ledger_entry_id ?? undefined,
        occurredAt: new Date(row.occurred_at),
        performedByUserId: row.performed_by_user_id,
      }),
    );
  }
}
