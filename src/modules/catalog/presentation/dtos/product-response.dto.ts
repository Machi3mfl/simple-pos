export interface ProductDTO {
  readonly id: string;
  readonly sku?: string;
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly stock?: number;
  readonly imageUrl?: string;
  readonly isActive: boolean;
}

export interface ProductListResponseDTO {
  readonly items: ProductDTO[];
}

export interface ProductResponseDTO {
  readonly item: ProductDTO;
}
