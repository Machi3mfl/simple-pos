export interface CustomerProps {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
}

export class Customer {
  private readonly id: string;
  private readonly name: string;
  private readonly createdAt: Date;

  private constructor(props: CustomerProps) {
    this.id = props.id;
    this.name = props.name;
    this.createdAt = props.createdAt;
  }

  static create(props: CustomerProps): Customer {
    return new Customer(props);
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }
}
