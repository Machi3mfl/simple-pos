export interface CreateProductDTO {
  readonly name: string;
  readonly categoryId: string;
  readonly price: number;
  readonly cost?: number;
  readonly initialStock: number;
  readonly imageUrl?: string;
}
