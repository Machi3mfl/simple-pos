import { CashManagementDomainError } from "../errors/CashManagementDomainError";

export interface CashRegisterPrimitives {
  readonly id: string;
  readonly name: string;
  readonly locationCode?: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
}

export class CashRegister {
  private constructor(private readonly props: CashRegisterPrimitives) {}

  static create(input: CashRegisterPrimitives): CashRegister {
    if (input.id.trim().length === 0) {
      throw new CashManagementDomainError("La caja debe tener un id.");
    }

    if (input.name.trim().length === 0) {
      throw new CashManagementDomainError("La caja debe tener un nombre.");
    }

    return new CashRegister({
      ...input,
      id: input.id.trim(),
      name: input.name.trim(),
      locationCode: input.locationCode?.trim() || undefined,
    });
  }

  getId(): string {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getLocationCode(): string | undefined {
    return this.props.locationCode;
  }

  isEnabled(): boolean {
    return this.props.isActive;
  }

  toPrimitives(): CashRegisterPrimitives {
    return { ...this.props };
  }
}
