import type { InventoryRepository } from "@/modules/inventory/domain/repositories/InventoryRepository";
import { calculateSaleTotal } from "@/modules/sales/domain/policies/SalePricingPolicy";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";

export interface GetProfitSummaryReportInput {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
}

export interface ProfitSummaryReportOutput {
  readonly revenue: number;
  readonly cost: number;
  readonly profit: number;
}

export class GetProfitSummaryReportUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly inventoryRepository: InventoryRepository,
  ) {}

  async execute(
    input: GetProfitSummaryReportInput = {},
  ): Promise<ProfitSummaryReportOutput> {
    const [sales, outboundMovements] = await Promise.all([
      this.saleRepository.list({
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      }),
      this.inventoryRepository.listStockMovements({
        movementType: "outbound",
        dateFrom: input.periodStart,
        dateTo: input.periodEnd,
      }),
    ]);

    const revenue = Number(
      sales.reduce((sum, sale) => sum + calculateSaleTotal(sale.getItems()), 0).toFixed(2),
    );

    const cost = Number(
      outboundMovements
        .reduce((sum, movement) => {
          const movementData = movement.toPrimitives();
          return sum + movementData.quantity * movementData.unitCost;
        }, 0)
        .toFixed(2),
    );

    return {
      revenue,
      cost,
      profit: Number((revenue - cost).toFixed(2)),
    };
  }
}
