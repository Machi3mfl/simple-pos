import type { SaleLineItem } from "../entities/Sale";

export function calculateSaleTotal(items: readonly SaleLineItem[]): number {
  return Number(
    items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0).toFixed(2),
  );
}

export function calculateSaleLineRevenue(line: SaleLineItem): number {
  return Number((line.quantity * line.unitPrice).toFixed(2));
}
