import type {
  RecordSaleInventoryInput,
  SaleInventoryRecorder,
} from "@/modules/sales/domain/services/SaleInventoryRecorder";

import { RegisterStockMovementUseCase } from "../use-cases/RegisterStockMovementUseCase";

export class SaleInventoryRecorderAdapter implements SaleInventoryRecorder {
  constructor(
    private readonly registerStockMovementUseCase: RegisterStockMovementUseCase,
  ) {}

  async recordSaleInventory(input: RecordSaleInventoryInput): Promise<void> {
    for (const item of input.items) {
      await this.registerStockMovementUseCase.execute({
        productId: item.productId,
        movementType: "outbound",
        quantity: item.quantity,
        reason: `Salida por venta ${input.saleId}`,
      });
    }
  }
}
