export class AccountsReceivableDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountsReceivableDomainError";
  }
}

export class InvalidDebtAmountError extends AccountsReceivableDomainError {
  constructor() {
    super("El monto de deuda debe ser mayor a 0.");
    this.name = "InvalidDebtAmountError";
  }
}

export class CustomerNotFoundForDebtError extends AccountsReceivableDomainError {
  constructor(customerId: string) {
    super(`No se encontró el cliente ${customerId}.`);
    this.name = "CustomerNotFoundForDebtError";
  }
}

export class DebtPaymentExceedsOutstandingError extends AccountsReceivableDomainError {
  constructor(amount: number, outstanding: number) {
    super(`El pago de deuda ${amount} supera el saldo pendiente ${outstanding}.`);
    this.name = "DebtPaymentExceedsOutstandingError";
  }
}

export class DebtOrderNotFoundError extends AccountsReceivableDomainError {
  constructor(customerId: string, orderId: string) {
    super(`La venta ${orderId} no tiene deuda pendiente para el cliente ${customerId}.`);
    this.name = "DebtOrderNotFoundError";
  }
}

export class DebtPaymentExceedsOrderOutstandingError extends AccountsReceivableDomainError {
  constructor(orderId: string, amount: number, outstanding: number) {
    super(
      `El pago ${amount} supera el saldo pendiente ${outstanding} de la venta ${orderId}.`,
    );
    this.name = "DebtPaymentExceedsOrderOutstandingError";
  }
}
