export interface RecordSaleInventoryInput {
  readonly saleId: string;
  readonly items: readonly {
    readonly productId: string;
    readonly quantity: number;
  }[];
}

export interface SaleInventoryRecorder {
  recordSaleInventory(input: RecordSaleInventoryInput): Promise<void>;
}

export class NoopSaleInventoryRecorder implements SaleInventoryRecorder {
  async recordSaleInventory(_: RecordSaleInventoryInput): Promise<void> {
    return;
  }
}
