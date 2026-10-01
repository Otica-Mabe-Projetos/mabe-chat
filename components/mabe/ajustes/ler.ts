import "server-only";
import { cache } from "react";

import { lerSettingsDaOrg } from "@/lib/mabe/settings-da-org";
import { ajustesMabeDeSettings, PADRAO, type AjustesMabe } from "./ajustes";

/**
 * Os ajustes da Mabe da organização ativa. `cache` do React: layout e página na
 * mesma requisição fazem uma consulta só. O `orgId` vem sempre de
 * `resolveActiveOrg` (cookie validado), nunca do navegador.
 */
export const lerAjustesMabe = cache(async (orgId: string | null | undefined): Promise<AjustesMabe> => {
  if (!orgId) return PADRAO;
  return ajustesMabeDeSettings(await lerSettingsDaOrg(orgId));
});
