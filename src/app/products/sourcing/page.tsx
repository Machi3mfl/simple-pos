import { requireAuthenticatedWorkspacePage } from "@/modules/access-control/infrastructure/runtime/pageAccess";
import { ProtectedProductSourcingScreen } from "@/modules/product-sourcing/presentation/components/ProtectedProductSourcingScreen";
import { PosWorkspaceShell } from "@/modules/sales/presentation/components/PosWorkspaceShell";

export default async function ProductsSourcingPage(): Promise<JSX.Element> {
  await requireAuthenticatedWorkspacePage();

  return (
    <PosWorkspaceShell activeItemId="products">
      <ProtectedProductSourcingScreen />
    </PosWorkspaceShell>
  );
}
