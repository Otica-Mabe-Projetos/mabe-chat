/**
 * "Visual Mabe" — o mod de aparência da Ótica Mabe, fora do upstream.
 *
 * Ligado (padrão): cores da Mabe no app inteiro e a mesa do atendente no Inbox.
 * Desligado: o visual original do sistema, como vem da versão oficial. As funções
 * que acrescentamos (cadastrar membro, nova conversa…) não dependem dele.
 *
 * Vale por pessoa e por navegador, num cookie: quem pinta a página (servidor)
 * decide antes do primeiro quadro, sem piscar o visual errado.
 */
export const COOKIE_DO_VISUAL = "mabe_visual";

/** Dourado da marca (PRODUCT.md › Brand Commitments). A rampa oficial ajusta o contraste. */
export const COR_DA_MABE = "#a8802e";

export function visualMabeLigado(cookie: string | undefined | null): boolean {
  return cookie !== "padrao";
}

/** Leitura no navegador (componentes de cliente). */
export function lerCookie(nome: string): string | null {
  if (typeof document === "undefined") return null;
  const par = document.cookie.split("; ").find((c) => c.startsWith(`${nome}=`));
  return par ? decodeURIComponent(par.slice(nome.length + 1)) : null;
}

export function gravarCookie(nome: string, valor: string): void {
  document.cookie = `${nome}=${encodeURIComponent(valor)}; path=/; max-age=31536000; samesite=lax`;
}
