export class AccountsReceivableDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountsReceivableDomainError";
  }
}

export class InvalidDebtAmountError extends AccountsReceivableDomainError {
  constructor() {
    super("Debt amount must be greater than 0.");
    this.name = "InvalidDebtAmountError";
  }
}

export class CustomerNotFoundForDebtError extends AccountsReceivableDomainError {
  constructor(customerId: string) {
    super(`Customer ${customerId} was not found.`);
    this.name = "CustomerNotFoundForDebtError";
  }
}

export class DebtPaymentExceedsOutstandingError extends AccountsReceivableDomainError {
  constructor(amount: number, outstanding: number) {
    super(
      `Debt payment amount ${amount} exceeds outstanding balance ${outstanding}.`,
    );
    this.name = "DebtPaymentExceedsOutstandingError";
  }
}

export class DebtOrderNotFoundError extends AccountsReceivableDomainError {
  constructor(customerId: string, orderId: string) {
    super(`Order ${orderId} has no outstanding debt for customer ${customerId}.`);
    this.name = "DebtOrderNotFoundError";
  }
}

export class DebtPaymentExceedsOrderOutstandingError extends AccountsReceivableDomainError {
  constructor(orderId: string, amount: number, outstanding: number) {
    super(
      `Debt payment amount ${amount} exceeds outstanding balance ${outstanding} for order ${orderId}.`,
    );
    this.name = "DebtPaymentExceedsOrderOutstandingError";
  }
}
