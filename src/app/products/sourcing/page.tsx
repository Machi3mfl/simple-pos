import { ProtectedProductSourcingScreen } from "@/modules/product-sourcing/presentation/components/ProtectedProductSourcingScreen";
import { PosWorkspaceShell } from "@/modules/sales/presentation/components/PosWorkspaceShell";

export default function ProductsSourcingPage(): JSX.Element {
  return (
    <PosWorkspaceShell activeItemId="products">
      <ProtectedProductSourcingScreen />
    </PosWorkspaceShell>
  );
}
