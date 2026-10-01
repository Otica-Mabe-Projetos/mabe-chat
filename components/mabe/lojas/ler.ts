import "server-only";
import { cache } from "react";

import { lerSettingsDaOrg } from "@/lib/mabe/settings-da-org";
import { CONFIG_PADRAO, lojasDeSettings, type ConfigLojas } from "./lojas";

/**
 * As lojas da organização ativa (`organizations.settings.mabe_lojas`). `cache` do
 * React: layout, página e ações na mesma requisição fazem uma consulta só. O
 * `orgId` vem sempre de `resolveActiveOrg` (cookie validado), nunca do navegador.
 */
export const lerLojas = cache(async (orgId: string | null | undefined): Promise<ConfigLojas> => {
  if (!orgId) return CONFIG_PADRAO;
  return lojasDeSettings(await lerSettingsDaOrg(orgId));
});
