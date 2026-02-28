import { notFound } from "next/navigation";

import { PosLayout } from "@/modules/sales/presentation/components/PosLayout";
import { isPosWorkspaceId, type PosWorkspaceId } from "@/modules/sales/presentation/posWorkspace";

interface PosWorkspacePageProps {
  readonly params: {
    readonly workspace: string;
  };
}

export default function PosWorkspacePage({
  params,
}: PosWorkspacePageProps): JSX.Element {
  if (!isPosWorkspaceId(params.workspace)) {
    notFound();
  }

  return <PosLayout initialWorkspace={params.workspace as PosWorkspaceId} />;
}
