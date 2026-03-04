import { requireAuthenticatedWorkspacePage } from "@/modules/access-control/infrastructure/runtime/pageAccess";
import { notFound } from "next/navigation";

import { PosLayout } from "@/modules/sales/presentation/components/PosLayout";
import { isPosWorkspaceId, type PosWorkspaceId } from "@/modules/sales/presentation/posWorkspace";

interface PosWorkspacePageProps {
  readonly params: {
    readonly workspace: string;
  };
}

export default async function PosWorkspacePage({
  params,
}: PosWorkspacePageProps): Promise<JSX.Element> {
  if (!isPosWorkspaceId(params.workspace)) {
    notFound();
  }

  await requireAuthenticatedWorkspacePage();

  return <PosLayout initialWorkspace={params.workspace as PosWorkspaceId} />;
}
