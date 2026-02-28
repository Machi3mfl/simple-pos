import type { Sale, SalePaymentMethod } from "../entities/Sale";

export interface SaleFilters {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly paymentMethod?: SalePaymentMethod;
}

export interface SaleRepository {
  save(sale: Sale): Promise<void>;
  list(filters?: SaleFilters): Promise<readonly Sale[]>;
}
