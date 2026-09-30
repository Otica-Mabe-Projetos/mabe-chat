import "server-only";

import { vale } from "@/components/mabe/ajustes/ajustes";
import { lerAjustesMabe } from "@/components/mabe/ajustes/ler";
import type { ActiveOrg } from "@/lib/auth/types";

export const LOGO_DA_MABE = "/mabe/logo.png";
export const LOGO_DA_MABE_ESCURO = "/mabe/logo-escuro.png";

/**
 * Logo da Ótica Mabe no menu lateral quando o Visual Mabe manda — personalização
 * da Ótica Mabe. Usa o campo oficial `activeOrg.marca` (o mesmo que a marca por
 * organização preenche), então a barra lateral não precisa saber do mod.
 */
export async function comMarcaMabe<T extends ActiveOrg>(org: T): Promise<T> {
  if (!vale(await lerAjustesMabe(org.orgId), "logo")) return org;
  return {
    ...org,
    marca: { ...org.marca, nome: "Ótica Mabe", logoUrl: LOGO_DA_MABE, logoDarkUrl: LOGO_DA_MABE_ESCURO },
  };
}
