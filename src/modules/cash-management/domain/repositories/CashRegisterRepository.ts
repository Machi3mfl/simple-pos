import type { CashRegister } from "../entities/CashRegister";

export interface CashRegisterRepository {
  listActive(): Promise<readonly CashRegister[]>;
  getById(id: string): Promise<CashRegister | null>;
}
