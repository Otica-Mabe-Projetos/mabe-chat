/**
 * Modo do Inbox — personalização da Ótica Mabe, fora do upstream.
 *
 * "atendente" é a mesa enxuta (components/mabe/atendimento); "completo" é o Inbox
 * oficial. Quem é `agent` cai no modo atendente; os outros papéis no completo. A
 * escolha de cada pessoa fica num cookie, para a página (componente de servidor)
 * decidir antes de pintar, sem piscar a tela errada.
 */
export const COOKIE_DO_MODO = "mabe_modo_inbox";

export type ModoDoInbox = "atendente" | "completo";

export function modoDoInbox(cookie: string | undefined, papel: string): ModoDoInbox {
  if (cookie === "atendente" || cookie === "completo") return cookie;
  return papel === "agent" ? "atendente" : "completo";
}
