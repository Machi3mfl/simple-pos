import { ProductSourcingScreen } from "@/modules/product-sourcing/presentation/components/ProductSourcingScreen";
import { PosWorkspaceShell } from "@/modules/sales/presentation/components/PosWorkspaceShell";

export default function ProductsSourcingPage(): JSX.Element {
  return (
    <PosWorkspaceShell activeItemId="products">
      <ProductSourcingScreen embedded />
    </PosWorkspaceShell>
  );
}
