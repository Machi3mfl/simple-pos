import type { FullConfig } from "@playwright/test";

import { ensureDemoAuthUsers } from "./access-control-auth";

export default async function globalSetup(config: FullConfig): Promise<void> {
  void config;
  await ensureDemoAuthUsers();
}
