import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "on_account"]);
export type PaymentMethodDTO = z.infer<typeof paymentMethodSchema>;

export const createSaleItemDTOSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type CreateSaleItemDTO = z.infer<typeof createSaleItemDTOSchema>;

export const createSaleDTOSchema = z.object({
  items: z.array(createSaleItemDTOSchema).min(1),
  paymentMethod: paymentMethodSchema,
  cashRegisterId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  customerName: z.string().min(2).max(120).optional(),
  createCustomerIfMissing: z.boolean().optional(),
  initialPaymentAmount: z.number().min(0).optional(),
}).superRefine((payload, context) => {
  if (
    payload.paymentMethod === "on_account" &&
    !payload.customerId &&
    !payload.customerName
  ) {
    context.addIssue({
      code: "custom",
      path: ["customerId"],
      message:
        "customerId o customerName es obligatorio cuando paymentMethod es on_account.",
    });
  }

  if (
    payload.paymentMethod !== "on_account" &&
    payload.initialPaymentAmount !== undefined
  ) {
    context.addIssue({
      code: "custom",
      path: ["initialPaymentAmount"],
      message:
        "initialPaymentAmount solo está permitido cuando paymentMethod es on_account.",
    });
  }

  if (
    payload.paymentMethod === "on_account" &&
    payload.customerName &&
    !payload.customerId &&
    payload.createCustomerIfMissing !== true
  ) {
    context.addIssue({
      code: "custom",
      path: ["createCustomerIfMissing"],
      message:
        "Para crear un cliente nuevo en cuenta corriente debés confirmar createCustomerIfMissing.",
    });
  }
});

export type CreateSaleDTO = z.infer<typeof createSaleDTOSchema>;
