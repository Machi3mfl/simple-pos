import { calculateSaleTotal } from "@/modules/sales/domain/policies/SalePricingPolicy";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";
import type { SalePaymentMethod } from "@/modules/sales/domain/entities/Sale";

export interface GetSalesHistoryReportInput {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
  readonly paymentMethod?: SalePaymentMethod;
}

export interface SalesHistoryReportItem {
  readonly saleId: string;
  readonly paymentMethod: SalePaymentMethod;
  readonly customerId?: string;
  readonly total: number;
  readonly itemCount: number;
  readonly createdAt: string;
}

export class GetSalesHistoryReportUseCase {
  constructor(private readonly saleRepository: SaleRepository) {}

  async execute(
    input: GetSalesHistoryReportInput = {},
  ): Promise<readonly SalesHistoryReportItem[]> {
    const sales = await this.saleRepository.list({
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      paymentMethod: input.paymentMethod,
    });

    return sales.map((sale) => ({
      saleId: sale.getId(),
      paymentMethod: sale.getPaymentMethod(),
      customerId: sale.getCustomerId(),
      total: Number(calculateSaleTotal(sale.getItems()).toFixed(2)),
      itemCount: sale.getItems().reduce((sum, line) => sum + line.quantity, 0),
      createdAt: sale.getCreatedAt().toISOString(),
    }));
  }
}
