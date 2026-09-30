import { vale } from "@/components/mabe/ajustes/ajustes";
import { lerAjustesMabe } from "@/components/mabe/ajustes/ler";
import { cssDoTom } from "./cor";

/**
 * As cores da Mabe quando Configurações › Visual Mabe está ligado —
 * personalização da Ótica Mabe. Desligado, nada é emitido e o app fica com a cor
 * original do sistema.
 */
export async function EstiloMabe({ orgId }: { orgId: string | null | undefined }) {
  if (!orgId) return null;
  const ajustes = await lerAjustesMabe(orgId);
  if (!vale(ajustes, "visual")) return null;
  const css = cssDoTom(ajustes.tom);
  return css ? <style id="visual-mabe" dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
