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
