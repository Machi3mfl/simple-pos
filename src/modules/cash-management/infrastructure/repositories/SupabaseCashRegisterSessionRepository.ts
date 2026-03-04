import type { SupabaseClient } from "@supabase/supabase-js";

import { CashRegisterSession } from "../../domain/entities/CashRegisterSession";
import type { CashRegisterSessionRepository } from "../../domain/repositories/CashRegisterSessionRepository";

interface CashRegisterSessionRow {
  readonly id: string;
  readonly cash_register_id: string;
  readonly status: "open" | "closing_review_required" | "closed" | "voided";
  readonly opening_float_amount: number | string;
  readonly expected_balance_amount: number | string;
  readonly counted_closing_amount: number | string | null;
  readonly discrepancy_amount: number | string | null;
  readonly opened_at: string;
  readonly opened_by_user_id: string;
  readonly closeout_submitted_at: string | null;
  readonly closeout_submitted_by_user_id: string | null;
  readonly closed_at: string | null;
  readonly closed_by_user_id: string | null;
  readonly discrepancy_approved_at: string | null;
  readonly discrepancy_approved_by_user_id: string | null;
  readonly discrepancy_approval_notes: string | null;
  readonly opening_notes: string | null;
  readonly closing_notes: string | null;
}

function parseNumeric(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class SupabaseCashRegisterSessionRepository
  implements CashRegisterSessionRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async findById(id: string): Promise<CashRegisterSession | null> {
    const { data, error } = await this.client
      .from("cash_register_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load cash session in Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToEntity(data as CashRegisterSessionRow);
  }

  async findOpenByRegisterId(registerId: string): Promise<CashRegisterSession | null> {
    const { data, error } = await this.client
      .from("cash_register_sessions")
      .select("*")
      .eq("cash_register_id", registerId)
      .in("status", ["open", "closing_review_required"])
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load active cash session in Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToEntity(data as CashRegisterSessionRow);
  }

  async save(session: CashRegisterSession): Promise<void> {
    const primitives = session.toPrimitives();
    const payload = {
      id: primitives.id,
      cash_register_id: primitives.cashRegisterId,
      status: primitives.status,
      opening_float_amount: primitives.openingFloatAmount,
      expected_balance_amount: primitives.expectedBalanceAmount,
      counted_closing_amount: primitives.countedClosingAmount ?? null,
      discrepancy_amount: primitives.discrepancyAmount ?? null,
      opened_at: primitives.openedAt.toISOString(),
      opened_by_user_id: primitives.openedByUserId,
      closeout_submitted_at: primitives.closeoutSubmittedAt?.toISOString() ?? null,
      closeout_submitted_by_user_id: primitives.closeoutSubmittedByUserId ?? null,
      closed_at: primitives.closedAt?.toISOString() ?? null,
      closed_by_user_id: primitives.closedByUserId ?? null,
      discrepancy_approved_at:
        primitives.discrepancyApprovedAt?.toISOString() ?? null,
      discrepancy_approved_by_user_id:
        primitives.discrepancyApprovedByUserId ?? null,
      discrepancy_approval_notes: primitives.discrepancyApprovalNotes ?? null,
      opening_notes: primitives.openingNotes ?? null,
      closing_notes: primitives.closingNotes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.client
      .from("cash_register_sessions")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      throw new Error(`Failed to save cash session in Supabase: ${error.message}`);
    }
  }

  private mapRowToEntity(row: CashRegisterSessionRow): CashRegisterSession {
    return CashRegisterSession.rehydrate({
      id: row.id,
      cashRegisterId: row.cash_register_id,
      status: row.status,
      openingFloatAmount: parseNumeric(row.opening_float_amount) ?? 0,
      expectedBalanceAmount: parseNumeric(row.expected_balance_amount) ?? 0,
      countedClosingAmount: parseNumeric(row.counted_closing_amount),
      discrepancyAmount: parseNumeric(row.discrepancy_amount),
      openedAt: new Date(row.opened_at),
      openedByUserId: row.opened_by_user_id,
      closeoutSubmittedAt: row.closeout_submitted_at
        ? new Date(row.closeout_submitted_at)
        : undefined,
      closeoutSubmittedByUserId: row.closeout_submitted_by_user_id ?? undefined,
      closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
      closedByUserId: row.closed_by_user_id ?? undefined,
      discrepancyApprovedAt: row.discrepancy_approved_at
        ? new Date(row.discrepancy_approved_at)
        : undefined,
      discrepancyApprovedByUserId:
        row.discrepancy_approved_by_user_id ?? undefined,
      discrepancyApprovalNotes: row.discrepancy_approval_notes ?? undefined,
      openingNotes: row.opening_notes ?? undefined,
      closingNotes: row.closing_notes ?? undefined,
    });
  }
}
