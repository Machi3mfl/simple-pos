import { ApplyBulkPriceUpdateUseCase } from "../../application/use-cases/ApplyBulkPriceUpdateUseCase";
import { CreateProductUseCase } from "../../application/use-cases/CreateProductUseCase";
import { ListProductsUseCase } from "../../application/use-cases/ListProductsUseCase";
import { InMemoryProductRepository } from "../repositories/InMemoryProductRepository";

const productRepository = new InMemoryProductRepository();

export const catalogMockRuntime = {
  createProductUseCase: new CreateProductUseCase(productRepository),
  listProductsUseCase: new ListProductsUseCase(productRepository),
  applyBulkPriceUpdateUseCase: new ApplyBulkPriceUpdateUseCase(productRepository),
};
