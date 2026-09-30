import { TONS, type Tom } from "@/components/mabe/ajustes/ajustes";
import { cssDaMarca } from "@/lib/branding/css";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import { resolverMarca } from "@/lib/branding/resolve";
import { envelopeDeSemente } from "@/lib/branding/schema";

/**
 * O CSS das cores da Mabe para um tom, pelo MESMO caminho da marca oficial
 * (`resolverMarca` + `cssDaMarca`): a rampa sai com o contraste ajustado para
 * claro e escuro. A camada precisa do envelope (`envelopeDeSemente`), não do hex
 * cru — com o hex cru o resolvedor recusa em silêncio e nada é pintado.
 */
export function cssDoTom(tom: Tom): string | null {
  const { cor } = resolverMarca([{ origem: "visual-mabe", cor: envelopeDeSemente(TONS[tom]) }], REGUA_DO_PRODUTO);
  return cssDaMarca(cor).css;
}
