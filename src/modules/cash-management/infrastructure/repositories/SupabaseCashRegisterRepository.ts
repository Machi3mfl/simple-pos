import type { SupabaseClient } from "@supabase/supabase-js";

import { CashRegister } from "../../domain/entities/CashRegister";
import type { CashRegisterRepository } from "../../domain/repositories/CashRegisterRepository";

interface CashRegisterRow {
  readonly id: string;
  readonly name: string;
  readonly location_code: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
}

export class SupabaseCashRegisterRepository implements CashRegisterRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listActive(): Promise<readonly CashRegister[]> {
    const { data, error } = await this.client
      .from("cash_registers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      throw new Error(`Failed to list cash registers in Supabase: ${error.message}`);
    }

    return ((data as readonly CashRegisterRow[] | null) ?? []).map((row) =>
      this.mapRowToEntity(row),
    );
  }

  async getById(id: string): Promise<CashRegister | null> {
    const { data, error } = await this.client
      .from("cash_registers")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load cash register in Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToEntity(data as CashRegisterRow);
  }

  private mapRowToEntity(row: CashRegisterRow): CashRegister {
    return CashRegister.create({
      id: row.id,
      name: row.name,
      locationCode: row.location_code ?? undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    });
  }
}
