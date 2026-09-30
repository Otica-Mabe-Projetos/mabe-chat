import { TONS, vale } from "@/components/mabe/ajustes/ajustes";
import { lerAjustesMabe } from "@/components/mabe/ajustes/ler";
import { cssDaMarca } from "@/lib/branding/css";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import { resolverMarca } from "@/lib/branding/resolve";

/**
 * As cores da Mabe quando Configurações › Visual Mabe está ligado —
 * personalização da Ótica Mabe.
 *
 * Passa o tom escolhido pelo MESMO caminho da marca oficial (`resolverMarca` +
 * `cssDaMarca`), então a rampa sai com o contraste ajustado para claro e escuro.
 * Desligado, nada é emitido e o app fica com a cor original do sistema.
 */
export async function EstiloMabe({ orgId }: { orgId: string | null | undefined }) {
  if (!orgId) return null;
  const ajustes = await lerAjustesMabe(orgId);
  if (!vale(ajustes, "visual")) return null;
  const { cor } = resolverMarca([{ origem: "visual-mabe", cor: TONS[ajustes.tom] }], REGUA_DO_PRODUTO);
  const { css } = cssDaMarca(cor);
  return css ? <style id="visual-mabe" dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
