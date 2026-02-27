export interface CreateDebtPaymentDTO {
  readonly customerId: string;
  readonly amount: number;
  readonly paymentMethod: "cash";
  readonly notes?: string;
}
