export interface DebtPaymentResponseDTO {
  readonly paymentId: string;
  readonly customerId: string;
  readonly amount: number;
  readonly createdAt: string;
}
