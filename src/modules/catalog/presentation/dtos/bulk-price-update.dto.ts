export type BulkPriceUpdateScopeType = "all" | "category" | "selection";

export type BulkPriceUpdateMode = "percentage" | "fixed_amount";

export interface BulkPriceUpdateScopeDTO {
  readonly type: BulkPriceUpdateScopeType;
  readonly categoryId?: string;
  readonly productIds?: string[];
}

export interface BulkPriceUpdateDTO {
  readonly scope: BulkPriceUpdateScopeDTO;
  readonly mode: BulkPriceUpdateMode;
  readonly value: number;
  readonly previewOnly?: boolean;
}

export interface BulkPriceUpdateResultItemDTO {
  readonly productId: string;
  readonly oldPrice: number;
  readonly newPrice: number;
}

export interface BulkPriceUpdateResponseDTO {
  readonly batchId: string;
  readonly updatedCount: number;
  readonly items: BulkPriceUpdateResultItemDTO[];
  readonly appliedAt: string;
}
