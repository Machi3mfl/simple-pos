export type PaymentMethodDTO = "cash" | "on_account";

export interface CreateSaleItemDTO {
  readonly productId: string;
  readonly quantity: number;
}

export interface CreateSaleDTO {
  readonly items: CreateSaleItemDTO[];
  readonly paymentMethod: PaymentMethodDTO;
  readonly customerId?: string;
}
