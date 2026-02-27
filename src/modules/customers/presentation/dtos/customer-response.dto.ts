export interface CustomerResponseDTO {
  readonly id: string;
  readonly name: string;
  readonly phone?: string;
  readonly notes?: string;
  readonly createdAt: string;
}
