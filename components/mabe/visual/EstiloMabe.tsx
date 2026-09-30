import { lerAjustesMabe } from "@/components/mabe/ajustes/ler";
import { cssDaMarca } from "@/lib/branding/css";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import { resolverMarca } from "@/lib/branding/resolve";

/** Dourado da marca (PRODUCT.md › Brand Commitments). A rampa oficial ajusta o contraste. */
export const COR_DA_MABE = "#a8802e";

/**
 * As cores da Mabe quando o "Visual Mabe" está ligado em Configurações —
 * personalização da Ótica Mabe.
 *
 * Passa o dourado pelo MESMO caminho da marca oficial (`resolverMarca` +
 * `cssDaMarca`), então a rampa sai com o contraste ajustado para claro e escuro.
 * Desligado, nada é emitido e o app fica com a cor original do sistema.
 */
export async function EstiloMabe({ orgId }: { orgId: string | null | undefined }) {
  if (!orgId || !(await lerAjustesMabe(orgId)).visual) return null;
  const { cor } = resolverMarca([{ origem: "visual-mabe", cor: COR_DA_MABE }], REGUA_DO_PRODUTO);
  const { css } = cssDaMarca(cor);
  return css ? <style id="visual-mabe" dangerouslySetInnerHTML={{ __html: css }} /> : null;
}
