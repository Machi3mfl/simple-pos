import type { SaleLineItem } from "../entities/Sale";

export const DEFAULT_SALE_UNIT_PRICE = 10;

export function calculateSaleTotal(items: readonly SaleLineItem[]): number {
  return items.reduce((sum, line) => sum + line.quantity * DEFAULT_SALE_UNIT_PRICE, 0);
}

export function calculateSaleLineRevenue(quantity: number): number {
  return quantity * DEFAULT_SALE_UNIT_PRICE;
}
