/**
 * Modo do Inbox — personalização da Ótica Mabe, fora do upstream.
 *
 * "atendente" é a mesa enxuta (components/mabe/atendimento); "completo" é o Inbox
 * oficial. Quem manda é Configurações › Visual Mabe (components/mabe/ajustes):
 * com a mesa desligada, todos usam o completo. Ligada, quem é `agent` cai na mesa
 * e os outros papéis no completo; quem pode trocar guarda a escolha num cookie,
 * para a página (servidor) decidir antes de pintar, sem piscar a tela errada.
 */
import { vale, type AjustesMabe } from "@/components/mabe/ajustes/ajustes";

export const COOKIE_DO_MODO = "mabe_modo_inbox";

export type ModoDoInbox = "atendente" | "completo";

type Regras = AjustesMabe;

export function podeTrocarModo(papel: string, a: Regras): boolean {
  return vale(a, "mesa") && (papel !== "agent" || a.atendente_troca);
}

export function modoDoInbox(cookie: string | undefined, papel: string, a: Regras): ModoDoInbox {
  if (!vale(a, "mesa")) return "completo";
  if (podeTrocarModo(papel, a) && (cookie === "atendente" || cookie === "completo")) return cookie;
  return a.mesa_para === "todos" || papel === "agent" ? "atendente" : "completo";
}
