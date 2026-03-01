import type { DebtLedgerEntry } from "@/modules/accounts-receivable/domain/entities/DebtLedgerEntry";
import type { Product } from "@/modules/catalog/domain/entities/Product";
import type { Customer } from "@/modules/customers/domain/entities/Customer";
import type { InventoryItem } from "@/modules/inventory/domain/entities/InventoryItem";
import type { StockMovement } from "@/modules/inventory/domain/entities/StockMovement";
import type { Sale } from "@/modules/sales/domain/entities/Sale";
import type { SyncedEventRecord } from "@/modules/sync/domain/repositories/SyncEventRepository";

export interface MockStore {
  readonly customersById: Map<string, Customer>;
  readonly debtEntriesByCustomerId: Map<string, DebtLedgerEntry[]>;
  readonly inventoryByProductId: Map<string, InventoryItem>;
  readonly products: Product[];
  readonly sales: Sale[];
  readonly stockMovements: StockMovement[];
  readonly syncedEventsByIdempotencyKey: Map<string, SyncedEventRecord>;
}

declare global {
  var __simplePosMockStore__: MockStore | undefined;
}

function createMockStore(): MockStore {
  return {
    customersById: new Map<string, Customer>(),
    debtEntriesByCustomerId: new Map<string, DebtLedgerEntry[]>(),
    inventoryByProductId: new Map<string, InventoryItem>(),
    products: [],
    sales: [],
    stockMovements: [],
    syncedEventsByIdempotencyKey: new Map<string, SyncedEventRecord>(),
  };
}

export function getMockStore(): MockStore {
  // Next route handlers can be evaluated from different module graphs, so
  // repository class statics are not reliable for mock persistence.
  if (!globalThis.__simplePosMockStore__) {
    globalThis.__simplePosMockStore__ = createMockStore();
  }

  return globalThis.__simplePosMockStore__;
}
