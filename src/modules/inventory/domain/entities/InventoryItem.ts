import {
  InsufficientStockError,
  InvalidInboundUnitCostError,
  InvalidInventoryQuantityError,
} from "../errors/InventoryDomainError";

export type InventoryMovementType = "inbound" | "outbound" | "adjustment";

interface InventoryItemProps {
  readonly productId: string;
  readonly stockOnHand: number;
  readonly weightedAverageUnitCost: number;
}

interface InventoryMovementEffect {
  readonly movementType: InventoryMovementType;
  readonly quantity: number;
  readonly unitCostApplied: number;
  readonly stockOnHandAfter: number;
  readonly weightedAverageUnitCostAfter: number;
  readonly inventoryValueAfter: number;
}

export class InventoryItem {
  private readonly productId: string;
  private readonly stockOnHand: number;
  private readonly weightedAverageUnitCost: number;

  private constructor(props: InventoryItemProps) {
    this.productId = props.productId;
    this.stockOnHand = props.stockOnHand;
    this.weightedAverageUnitCost = props.weightedAverageUnitCost;
  }

  static initialize(productId: string): InventoryItem {
    return new InventoryItem({
      productId,
      stockOnHand: 0,
      weightedAverageUnitCost: 0,
    });
  }

  static rehydrate(props: InventoryItemProps): InventoryItem {
    return new InventoryItem(props);
  }

  applyInbound(quantity: number, unitCost: number): InventoryMovementEffect {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new InvalidInventoryQuantityError();
    }

    if (!Number.isFinite(unitCost) || unitCost <= 0) {
      throw new InvalidInboundUnitCostError();
    }

    const currentInventoryValue = this.stockOnHand * this.weightedAverageUnitCost;
    const inboundInventoryValue = quantity * unitCost;
    const stockOnHandAfter = this.stockOnHand + quantity;
    const weightedAverageUnitCostAfter =
      stockOnHandAfter === 0
        ? 0
        : (currentInventoryValue + inboundInventoryValue) / stockOnHandAfter;

    return {
      movementType: "inbound",
      quantity,
      unitCostApplied: unitCost,
      stockOnHandAfter: Number(stockOnHandAfter.toFixed(4)),
      weightedAverageUnitCostAfter: Number(weightedAverageUnitCostAfter.toFixed(4)),
      inventoryValueAfter: Number((stockOnHandAfter * weightedAverageUnitCostAfter).toFixed(4)),
    };
  }

  applyOutbound(quantity: number): InventoryMovementEffect {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new InvalidInventoryQuantityError();
    }

    if (quantity > this.stockOnHand) {
      throw new InsufficientStockError(this.productId, quantity, this.stockOnHand);
    }

    const stockOnHandAfter = this.stockOnHand - quantity;
    return {
      movementType: "outbound",
      quantity,
      unitCostApplied: this.weightedAverageUnitCost,
      stockOnHandAfter: Number(stockOnHandAfter.toFixed(4)),
      weightedAverageUnitCostAfter: this.weightedAverageUnitCost,
      inventoryValueAfter: Number((stockOnHandAfter * this.weightedAverageUnitCost).toFixed(4)),
    };
  }

  applyAdjustment(quantity: number): InventoryMovementEffect {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new InvalidInventoryQuantityError();
    }

    const stockOnHandAfter = this.stockOnHand + quantity;
    return {
      movementType: "adjustment",
      quantity,
      unitCostApplied: this.weightedAverageUnitCost,
      stockOnHandAfter: Number(stockOnHandAfter.toFixed(4)),
      weightedAverageUnitCostAfter: this.weightedAverageUnitCost,
      inventoryValueAfter: Number((stockOnHandAfter * this.weightedAverageUnitCost).toFixed(4)),
    };
  }

  evolve(effect: InventoryMovementEffect): InventoryItem {
    return InventoryItem.rehydrate({
      productId: this.productId,
      stockOnHand: effect.stockOnHandAfter,
      weightedAverageUnitCost: effect.weightedAverageUnitCostAfter,
    });
  }

  toPrimitives(): {
    readonly productId: string;
    readonly stockOnHand: number;
    readonly weightedAverageUnitCost: number;
    readonly inventoryValue: number;
  } {
    return {
      productId: this.productId,
      stockOnHand: this.stockOnHand,
      weightedAverageUnitCost: this.weightedAverageUnitCost,
      inventoryValue: Number((this.stockOnHand * this.weightedAverageUnitCost).toFixed(4)),
    };
  }
}
