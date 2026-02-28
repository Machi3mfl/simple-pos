import type { InventoryMovementType } from "./InventoryItem";

interface StockMovementProps {
  readonly id: string;
  readonly productId: string;
  readonly movementType: InventoryMovementType;
  readonly quantity: number;
  readonly unitCostApplied: number;
  readonly occurredAt: Date;
  readonly stockOnHandAfter: number;
  readonly weightedAverageUnitCostAfter: number;
  readonly inventoryValueAfter: number;
  readonly reason?: string;
}

export class StockMovement {
  private readonly props: StockMovementProps;

  private constructor(props: StockMovementProps) {
    this.props = props;
  }

  static register(props: StockMovementProps): StockMovement {
    return new StockMovement(props);
  }

  getId(): string {
    return this.props.id;
  }

  getProductId(): string {
    return this.props.productId;
  }

  getMovementType(): InventoryMovementType {
    return this.props.movementType;
  }

  getOccurredAt(): Date {
    return this.props.occurredAt;
  }

  toPrimitives(): {
    readonly movementId: string;
    readonly productId: string;
    readonly movementType: InventoryMovementType;
    readonly quantity: number;
    readonly unitCost: number;
    readonly occurredAt: string;
    readonly stockOnHandAfter: number;
    readonly weightedAverageUnitCostAfter: number;
    readonly inventoryValueAfter: number;
    readonly reason?: string;
  } {
    return {
      movementId: this.props.id,
      productId: this.props.productId,
      movementType: this.props.movementType,
      quantity: this.props.quantity,
      unitCost: this.props.unitCostApplied,
      occurredAt: this.props.occurredAt.toISOString(),
      stockOnHandAfter: this.props.stockOnHandAfter,
      weightedAverageUnitCostAfter: this.props.weightedAverageUnitCostAfter,
      inventoryValueAfter: this.props.inventoryValueAfter,
      reason: this.props.reason,
    };
  }
}
