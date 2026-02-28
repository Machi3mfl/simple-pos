import type { ProductRepository } from "@/modules/catalog/domain/repositories/ProductRepository";
import { calculateSaleLineRevenue } from "@/modules/sales/domain/policies/SalePricingPolicy";
import type { SaleRepository } from "@/modules/sales/domain/repositories/SaleRepository";

export interface GetTopProductsReportInput {
  readonly periodStart?: Date;
  readonly periodEnd?: Date;
}

export interface TopProductReportItem {
  readonly productId: string;
  readonly name: string;
  readonly quantitySold: number;
  readonly revenue: number;
}

export class GetTopProductsReportUseCase {
  constructor(
    private readonly saleRepository: SaleRepository,
    private readonly productRepository: ProductRepository,
  ) {}

  async execute(
    input: GetTopProductsReportInput = {},
  ): Promise<readonly TopProductReportItem[]> {
    const [sales, products] = await Promise.all([
      this.saleRepository.list({
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      }),
      this.productRepository.list(),
    ]);

    const productNameById = new Map(
      products.map((product) => {
        const primitives = product.toPrimitives();
        return [primitives.id, primitives.name] as const;
      }),
    );

    const aggregateByProductId = new Map<
      string,
      { quantitySold: number; revenue: number }
    >();

    for (const sale of sales) {
      for (const line of sale.getItems()) {
        const current = aggregateByProductId.get(line.productId) ?? {
          quantitySold: 0,
          revenue: 0,
        };
        current.quantitySold += line.quantity;
        current.revenue += calculateSaleLineRevenue(line.quantity);
        aggregateByProductId.set(line.productId, current);
      }
    }

    return Array.from(aggregateByProductId.entries())
      .map(([productId, summary]) => ({
        productId,
        name: productNameById.get(productId) ?? productId,
        quantitySold: summary.quantitySold,
        revenue: Number(summary.revenue.toFixed(2)),
      }))
      .sort((left, right) => {
        if (right.quantitySold !== left.quantitySold) {
          return right.quantitySold - left.quantitySold;
        }
        return right.revenue - left.revenue;
      });
  }
}
