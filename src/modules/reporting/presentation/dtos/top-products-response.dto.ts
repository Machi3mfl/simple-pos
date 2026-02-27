export interface TopProductItemDTO {
  readonly productId: string;
  readonly name: string;
  readonly quantitySold: number;
  readonly revenue: number;
}

export interface TopProductsResponseDTO {
  readonly items: TopProductItemDTO[];
}
