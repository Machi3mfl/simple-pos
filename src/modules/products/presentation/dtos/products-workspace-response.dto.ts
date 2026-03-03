import { z } from "zod";

export const productsWorkspaceStockStateDTOSchema = z.enum([
  "with_stock",
  "low_stock",
  "out_of_stock",
  "inactive",
]);

export const productsWorkspaceItemDTOSchema = z
  .object({
    id: z.string().min(1),
    sku: z.string().min(1),
    ean: z.string().regex(/^[0-9]{8,18}$/).optional(),
    name: z.string().min(1),
    categoryId: z.string().min(1),
    price: z.number().nonnegative(),
    averageCost: z.number().nonnegative(),
    stock: z.number().nonnegative(),
    minStock: z.number().int().min(0),
    imageUrl: z.string().min(1),
    isActive: z.boolean(),
    stockState: productsWorkspaceStockStateDTOSchema,
    lastMovementAt: z.string().min(1).optional(),
    lastMovementType: z.enum(["inbound", "outbound", "adjustment"]).optional(),
  })
  .strict();

export const productsWorkspaceResponseDTOSchema = z
  .object({
    items: z.array(productsWorkspaceItemDTOSchema),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().positive(),
    summary: z
      .object({
        withStock: z.number().int().min(0),
        lowStock: z.number().int().min(0),
        outOfStock: z.number().int().min(0),
        stockValue: z.number().nonnegative(),
      })
      .strict(),
  })
  .strict();
