import "server-only";
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/admin";
import { CONFIG_PADRAO, lojasDeSettings, type ConfigLojas } from "./lojas";

/**
 * As lojas da organização ativa (`organizations.settings.mabe_lojas`). `cache` do
 * React: layout, página e ações na mesma requisição fazem uma consulta só. O
 * `orgId` vem sempre de `resolveActiveOrg` (cookie validado), nunca do navegador.
 */
export const lerLojas = cache(async (orgId: string | null | undefined): Promise<ConfigLojas> => {
  if (!orgId) return CONFIG_PADRAO;
  const { data } = await createAdminClient()
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle();
  return lojasDeSettings(data?.settings ?? null);
});
