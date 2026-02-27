import type { PaymentMethodDTO } from "./create-sale.dto";

export interface SaleResponseDTO {
  readonly saleId: string;
  readonly paymentMethod: PaymentMethodDTO;
  readonly customerId?: string;
  readonly total: number;
  readonly createdAt: string;
}
