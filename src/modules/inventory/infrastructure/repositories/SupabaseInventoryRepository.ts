import type { SupabaseClient } from "@supabase/supabase-js";

import { InventoryItem } from "../../domain/entities/InventoryItem";
import { StockMovement } from "../../domain/entities/StockMovement";
import type {
  InventoryRepository,
  StockMovementFilters,
} from "../../domain/repositories/InventoryRepository";

interface InventoryItemRow {
  product_id: string;
  stock_on_hand: number;
  weighted_average_unit_cost: number;
}

interface StockMovementRow {
  id: string;
  product_id: string;
  movement_type: "inbound" | "outbound" | "adjustment";
  quantity: number;
  unit_cost: number;
  occurred_at: string;
  stock_on_hand_after: number;
  weighted_average_unit_cost_after: number;
  inventory_value_after: number;
  reason: string | null;
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

  throw new Error("Invalid numeric value in Supabase inventory row.");
}

function mapInventoryRowToDomain(row: InventoryItemRow): InventoryItem {
  return InventoryItem.rehydrate({
    productId: row.product_id,
    stockOnHand: toNumber(row.stock_on_hand),
    weightedAverageUnitCost: toNumber(row.weighted_average_unit_cost),
  });
}

function mapDomainToInventoryRow(item: InventoryItem): InventoryItemRow {
  const primitives = item.toPrimitives();
  return {
    product_id: primitives.productId,
    stock_on_hand: primitives.stockOnHand,
    weighted_average_unit_cost: primitives.weightedAverageUnitCost,
  };
}

function mapMovementRowToDomain(row: StockMovementRow): StockMovement {
  return StockMovement.register({
    id: row.id,
    productId: row.product_id,
    movementType: row.movement_type,
    quantity: toNumber(row.quantity),
    unitCostApplied: toNumber(row.unit_cost),
    occurredAt: new Date(row.occurred_at),
    stockOnHandAfter: toNumber(row.stock_on_hand_after),
    weightedAverageUnitCostAfter: toNumber(row.weighted_average_unit_cost_after),
    inventoryValueAfter: toNumber(row.inventory_value_after),
    reason: row.reason ?? undefined,
  });
}

function mapMovementToRow(movement: StockMovement): StockMovementRow {
  const primitives = movement.toPrimitives();
  return {
    id: primitives.movementId,
    product_id: primitives.productId,
    movement_type: primitives.movementType,
    quantity: primitives.quantity,
    unit_cost: primitives.unitCost,
    occurred_at: primitives.occurredAt,
    stock_on_hand_after: primitives.stockOnHandAfter,
    weighted_average_unit_cost_after: primitives.weightedAverageUnitCostAfter,
    inventory_value_after: primitives.inventoryValueAfter,
    reason: primitives.reason ?? null,
  };
}

export class SupabaseInventoryRepository implements InventoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getInventoryItem(productId: string): Promise<InventoryItem | null> {
    const { data, error } = await this.client
      .from("inventory_items")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to read inventory item from Supabase: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return mapInventoryRowToDomain(data as InventoryItemRow);
  }

  async saveInventoryItem(item: InventoryItem): Promise<void> {
    const row = mapDomainToInventoryRow(item);
    const { error } = await this.client
      .from("inventory_items")
      .upsert(row, { onConflict: "product_id" });

    if (error) {
      throw new Error(`Failed to save inventory item in Supabase: ${error.message}`);
    }
  }

  async appendStockMovement(movement: StockMovement): Promise<void> {
    const row = mapMovementToRow(movement);
    const { error } = await this.client.from("stock_movements").insert(row);

    if (error) {
      throw new Error(`Failed to append stock movement in Supabase: ${error.message}`);
    }
  }

  async listStockMovements(filters: StockMovementFilters = {}): Promise<readonly StockMovement[]> {
    let query = this.client.from("stock_movements").select("*");

    if (filters.productId) {
      query = query.eq("product_id", filters.productId);
    }

    if (filters.movementType) {
      query = query.eq("movement_type", filters.movementType);
    }

    if (filters.dateFrom) {
      query = query.gte("occurred_at", filters.dateFrom.toISOString());
    }

    if (filters.dateTo) {
      query = query.lte("occurred_at", filters.dateTo.toISOString());
    }

    const { data, error } = await query.order("occurred_at", { ascending: false });
    if (error) {
      throw new Error(`Failed to list stock movements from Supabase: ${error.message}`);
    }

    return (data ?? []).map((row) => mapMovementRowToDomain(row as StockMovementRow));
  }
}
