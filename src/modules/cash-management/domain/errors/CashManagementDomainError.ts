export class CashManagementDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CashManagementDomainError";
  }
}

export class CashRegisterNotFoundError extends CashManagementDomainError {
  constructor(registerId: string) {
    super(`No encontramos la caja ${registerId}.`);
    this.name = "CashRegisterNotFoundError";
  }
}

export class CashRegisterInactiveError extends CashManagementDomainError {
  constructor(registerId: string) {
    super(`La caja ${registerId} está inactiva.`);
    this.name = "CashRegisterInactiveError";
  }
}

export class CashRegisterAssignmentError extends CashManagementDomainError {
  constructor(registerId: string) {
    super(`El operador actual no tiene esa caja asignada: ${registerId}.`);
    this.name = "CashRegisterAssignmentError";
  }
}

export class CashRegisterSessionAlreadyOpenError extends CashManagementDomainError {
  constructor(registerId: string) {
    super(`Ya existe una sesión de caja abierta para ${registerId}.`);
    this.name = "CashRegisterSessionAlreadyOpenError";
  }
}

export class CashRegisterSessionNotFoundError extends CashManagementDomainError {
  constructor(sessionId: string) {
    super(`No encontramos la sesión de caja ${sessionId}.`);
    this.name = "CashRegisterSessionNotFoundError";
  }
}

export class CashRegisterActiveSessionRequiredError extends CashManagementDomainError {
  constructor(registerId: string) {
    super(`Debés abrir una caja en ${registerId} antes de registrar efectivo.`);
    this.name = "CashRegisterActiveSessionRequiredError";
  }
}

export class CashRegisterSelectionRequiredError extends CashManagementDomainError {
  constructor() {
    super("Debés seleccionar una caja para atribuir el movimiento de efectivo.");
    this.name = "CashRegisterSelectionRequiredError";
  }
}

export class CashRegisterSessionStatusError extends CashManagementDomainError {
  constructor(message: string) {
    super(message);
    this.name = "CashRegisterSessionStatusError";
  }
}
