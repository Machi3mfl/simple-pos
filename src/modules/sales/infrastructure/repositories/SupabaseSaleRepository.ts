import type { SupabaseClient } from "@supabase/supabase-js";

import { Sale } from "../../domain/entities/Sale";
import type { SaleLineItem, SalePaymentMethod } from "../../domain/entities/Sale";
import type { SaleFilters, SaleRepository } from "../../domain/repositories/SaleRepository";

interface SaleRow {
  id: string;
  payment_method: SalePaymentMethod;
  customer_id: string | null;
  created_at: string;
}

interface SaleItemRow {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
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

  throw new Error("Invalid numeric value in Supabase sale item row.");
}

export class SupabaseSaleRepository implements SaleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(sale: Sale): Promise<void> {
    const saleData = sale.toPrimitives();

    const { error: saleError } = await this.client.from("sales").upsert(
      {
        id: saleData.saleId,
        payment_method: saleData.paymentMethod,
        customer_id: saleData.customerId ?? null,
        created_at: saleData.createdAt,
      },
      { onConflict: "id" },
    );

    if (saleError) {
      throw new Error(`Failed to save sale in Supabase: ${saleError.message}`);
    }

    const { error: deleteItemsError } = await this.client
      .from("sale_items")
      .delete()
      .eq("sale_id", saleData.saleId);

    if (deleteItemsError) {
      throw new Error(`Failed to refresh sale items in Supabase: ${deleteItemsError.message}`);
    }

    const itemRows = saleData.items.map((item) => ({
      sale_id: saleData.saleId,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    if (itemRows.length > 0) {
      const { error: itemsError } = await this.client.from("sale_items").insert(itemRows);
      if (itemsError) {
        // Sales are immutable in this flow. If line persistence fails, remove the parent row
        // so downstream reporting does not ingest an orphan sale with zero items.
        await this.client.from("sales").delete().eq("id", saleData.saleId);
        throw new Error(`Failed to save sale items in Supabase: ${itemsError.message}`);
      }
    }
  }

  async list(filters: SaleFilters = {}): Promise<readonly Sale[]> {
    let query = this.client.from("sales").select("*");

    if (filters.paymentMethod) {
      query = query.eq("payment_method", filters.paymentMethod);
    }

    if (filters.periodStart) {
      query = query.gte("created_at", filters.periodStart.toISOString());
    }

    if (filters.periodEnd) {
      query = query.lte("created_at", filters.periodEnd.toISOString());
    }

    const { data: salesData, error: salesError } = await query.order("created_at", {
      ascending: false,
    });

    if (salesError) {
      throw new Error(`Failed to list sales from Supabase: ${salesError.message}`);
    }

    const saleRows = (salesData ?? []) as SaleRow[];
    if (saleRows.length === 0) {
      return [];
    }

    const saleIds = saleRows.map((row) => row.id);
    const { data: itemsData, error: itemsError } = await this.client
      .from("sale_items")
      .select("*")
      .in("sale_id", saleIds);

    if (itemsError) {
      throw new Error(`Failed to list sale items from Supabase: ${itemsError.message}`);
    }

    const rowsBySaleId = new Map<string, SaleLineItem[]>();
    for (const row of (itemsData ?? []) as SaleItemRow[]) {
      const current = rowsBySaleId.get(row.sale_id) ?? [];
      current.push({
        productId: row.product_id,
        quantity: Math.trunc(toNumber(row.quantity)),
        unitPrice: toNumber(row.unit_price),
      });
      rowsBySaleId.set(row.sale_id, current);
    }

    return saleRows.flatMap((row) => {
      const items = rowsBySaleId.get(row.id) ?? [];
      if (items.length === 0) {
        return [];
      }

      return [
        Sale.rehydrate({
          id: row.id,
          items,
          paymentMethod: row.payment_method,
          customerId: row.customer_id ?? undefined,
          createdAt: new Date(row.created_at),
        }),
      ];
    });
  }
}
