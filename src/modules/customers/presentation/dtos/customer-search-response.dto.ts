import type { CustomerResponseDTO } from "./customer-response.dto";

export interface CustomerSearchResponseDTO {
  readonly items: readonly CustomerResponseDTO[];
}
