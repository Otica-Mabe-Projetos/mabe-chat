import "server-only";
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `organizations.settings` da organização ativa, lido uma vez por requisição
 * (`cache` do React). Ajustes e lojas derivam daqui, então layout + página fazem
 * um select só. O `orgId` vem sempre de `resolveActiveOrg`, nunca do navegador.
 * Gravações NÃO usam isto: precisam ler fresco antes de escrever.
 */
export const lerSettingsDaOrg = cache(async (orgId: string): Promise<unknown> => {
  const { data } = await createAdminClient()
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();
  return data?.settings ?? null;
});
