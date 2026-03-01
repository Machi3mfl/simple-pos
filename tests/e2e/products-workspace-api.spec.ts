import { expect, test } from "@playwright/test";
import { z } from "zod";

import { bulkCreateProductsResponseDTOSchema } from "../../src/modules/catalog/presentation/dtos/bulk-create-products.dto";
import { productResponseDTOSchema } from "../../src/modules/catalog/presentation/dtos/product-response.dto";
import { bulkStockMovementsResponseDTOSchema } from "../../src/modules/inventory/presentation/dtos/bulk-stock-movements.dto";
import { productsWorkspaceResponseDTOSchema } from "../../src/modules/products/presentation/dtos/products-workspace-response.dto";

const apiErrorResponseSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z
      .array(
        z
          .object({
            field: z.string().min(1),
            message: z.string().min(1),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

function uniqueMarker(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

test.describe("products workspace api", () => {
  test("lists real stock state from inventory and supports filters", async ({ request }) => {
    const marker = uniqueMarker("workspace");
    const stockedResponse = await request.post("/api/v1/products", {
      data: {
        name: `Workspace Product ${marker}`,
        sku: `WRK-${marker.slice(-6)}`,
        categoryId: "snack",
        price: 100,
        cost: 40,
        initialStock: 6,
        minStock: 2,
      },
    });

    expect(stockedResponse.status()).toBe(201);
    const stockedBody = await stockedResponse.json();
    const stockedParsed = productResponseDTOSchema.parse(stockedBody);

    const lowStockResponse = await request.post("/api/v1/products", {
      data: {
        name: `Workspace Low ${marker}`,
        sku: `LOW-${marker.slice(-6)}`,
        categoryId: "snack",
        price: 80,
        cost: 30,
        initialStock: 2,
        minStock: 3,
      },
    });

    expect(lowStockResponse.status()).toBe(201);
    const lowStockBody = await lowStockResponse.json();
    const lowStockParsed = productResponseDTOSchema.parse(lowStockBody);

    const lowStockWorkspaceResponse = await request.get(
      "/api/v1/products/workspace?stockState=low_stock&activeOnly=true&sort=stock&page=1&pageSize=20",
    );
    expect(lowStockWorkspaceResponse.status()).toBe(200);
    const lowStockWorkspaceBody = await lowStockWorkspaceResponse.json();
    const lowStockWorkspaceParsed =
      productsWorkspaceResponseDTOSchema.parse(lowStockWorkspaceBody);

    expect(
      lowStockWorkspaceParsed.items.some((item) => item.id === lowStockParsed.item.id),
    ).toBe(true);
    expect(
      lowStockWorkspaceParsed.items.every((item) => item.stockState === "low_stock"),
    ).toBe(true);
    expect(lowStockWorkspaceParsed.summary.lowStock).toBeGreaterThan(0);

    const stockedWorkspaceResponse = await request.get(
      `/api/v1/products/workspace?q=${encodeURIComponent(marker)}&activeOnly=true`,
    );
    expect(stockedWorkspaceResponse.status()).toBe(200);
    const stockedWorkspaceBody = await stockedWorkspaceResponse.json();
    const stockedWorkspaceParsed = productsWorkspaceResponseDTOSchema.parse(
      stockedWorkspaceBody,
    );

    const stockedItem = stockedWorkspaceParsed.items.find(
      (item) => item.id === stockedParsed.item.id,
    );
    expect(stockedItem?.stock).toBe(6);
    expect(stockedItem?.stockState).toBe("with_stock");
  });

  test("updates and archives products through patch endpoint", async ({ request }) => {
    const marker = uniqueMarker("patch");
    const createResponse = await request.post("/api/v1/products", {
      data: {
        name: `Patch Product ${marker}`,
        sku: `PTC-${marker.slice(-6)}`,
        categoryId: "drink",
        price: 90,
        cost: 35,
        initialStock: 4,
        minStock: 1,
      },
    });

    expect(createResponse.status()).toBe(201);
    const createBody = await createResponse.json();
    const createParsed = productResponseDTOSchema.parse(createBody);

    const patchResponse = await request.patch(`/api/v1/products/${createParsed.item.id}`, {
      data: {
        name: `Patch Product Updated ${marker}`,
        price: 110,
        minStock: 5,
      },
    });

    expect(patchResponse.status()).toBe(200);
    const patchBody = await patchResponse.json();
    const patchParsed = productResponseDTOSchema.parse(patchBody);
    expect(patchParsed.item.name).toContain("Updated");
    expect(patchParsed.item.minStock).toBe(5);

    const archiveResponse = await request.patch(`/api/v1/products/${createParsed.item.id}`, {
      data: {
        isActive: false,
      },
    });
    expect(archiveResponse.status()).toBe(200);

    const activeWorkspaceResponse = await request.get("/api/v1/products/workspace?activeOnly=true");
    const activeWorkspaceBody = await activeWorkspaceResponse.json();
    const activeWorkspaceParsed = productsWorkspaceResponseDTOSchema.parse(activeWorkspaceBody);
    expect(
      activeWorkspaceParsed.items.some((item) => item.id === createParsed.item.id),
    ).toBe(false);

    const allWorkspaceResponse = await request.get(
      "/api/v1/products/workspace?activeOnly=false&stockState=inactive",
    );
    const allWorkspaceBody = await allWorkspaceResponse.json();
    const allWorkspaceParsed = productsWorkspaceResponseDTOSchema.parse(allWorkspaceBody);
    expect(
      allWorkspaceParsed.items.some((item) => item.id === createParsed.item.id),
    ).toBe(true);
  });

  test("supports bulk products import and bulk stock import with partial failures", async ({
    request,
  }) => {
    const marker = uniqueMarker("bulk");
    const productsImportResponse = await request.post("/api/v1/products/import", {
      data: {
        items: [
          {
            name: `Bulk Product A ${marker}`,
            sku: `BPA-${marker.slice(-6)}`,
            categoryId: "snack",
            price: 70,
            cost: 25,
            initialStock: 3,
            minStock: 1,
          },
          {
            name: `Bulk Product B ${marker}`,
            sku: `BPB-${marker.slice(-6)}`,
            categoryId: "drink",
            price: 50,
            initialStock: 2,
            minStock: 1,
          },
        ],
      },
    });

    expect(productsImportResponse.status()).toBe(200);
    const productsImportBody = await productsImportResponse.json();
    const productsImportParsed =
      bulkCreateProductsResponseDTOSchema.parse(productsImportBody);

    expect(productsImportParsed.importedCount).toBe(1);
    expect(productsImportParsed.invalidItems).toHaveLength(1);

    const importedProduct = productsImportParsed.items[0];
    if (!importedProduct) {
      throw new Error("Expected imported product in bulk import response");
    }

    const stockImportResponse = await request.post("/api/v1/stock-movements/import", {
      data: {
        items: [
          {
            productId: importedProduct.id,
            movementType: "inbound",
            quantity: 4,
            unitCost: 30,
            reason: "reposicion",
          },
          {
            productId: "missing-product",
            movementType: "outbound",
            quantity: 1,
          },
        ],
      },
    });

    expect(stockImportResponse.status()).toBe(200);
    const stockImportBody = await stockImportResponse.json();
    const stockImportParsed = bulkStockMovementsResponseDTOSchema.parse(stockImportBody);
    expect(stockImportParsed.appliedCount).toBe(1);
    expect(stockImportParsed.invalidItems).toHaveLength(1);

    const workspaceResponse = await request.get(
      `/api/v1/products/workspace?q=${encodeURIComponent(marker)}&activeOnly=true`,
    );
    expect(workspaceResponse.status()).toBe(200);
    const workspaceBody = await workspaceResponse.json();
    const workspaceParsed = productsWorkspaceResponseDTOSchema.parse(workspaceBody);
    const importedWorkspaceItem = workspaceParsed.items.find(
      (item) => item.id === importedProduct.id,
    );
    expect(importedWorkspaceItem?.stock).toBe(7);
  });

  test("validates invalid workspace params", async ({ request }) => {
    const response = await request.get(
      "/api/v1/products/workspace?activeOnly=maybe&page=zero&sort=bad",
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(apiErrorResponseSchema.safeParse(body).success).toBe(true);
  });
});
