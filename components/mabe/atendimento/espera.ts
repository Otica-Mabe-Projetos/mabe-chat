/**
 * Desde quando o cliente espera resposta — `null` quando a última palavra é nossa.
 * `awaiting_since` não zera quando respondemos: a resposta grava nele o
 * `last_inbound_at` (ver `fn_mark_conversation_message` no baseline), então só há
 * espera quando ele é POSTERIOR à última saída.
 */
export function esperaDesde(c: {
  awaiting_since?: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
}): string | null {
  const desde = c.awaiting_since ?? c.last_inbound_at;
  if (!desde) return null;
  if (c.last_outbound_at && new Date(desde).getTime() <= new Date(c.last_outbound_at).getTime()) return null;
  return desde;
}

export type TomDaEspera = "ok" | "atencao" | "atrasado";

/** A régua da mesa: âmbar a partir de 5 min de espera, vermelho a partir de 15. */
export function tomDaEspera(minutos: number): TomDaEspera {
  return minutos >= 15 ? "atrasado" : minutos >= 5 ? "atencao" : "ok";
}

/** "3 min", "1 h 20 min", "2 h". Abaixo de 1 min conta como 1. */
export function formatarEspera(minutos: number): string {
  const m = Math.max(1, Math.floor(minutos));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const resto = m % 60;
  return resto ? `${h} h ${resto} min` : `${h} h`;
}

/**
 * Quem espera há mais tempo entre as conversas JÁ carregadas (sem consulta nova)
 * e quantas esperam. `null` quando ninguém espera.
 */
export function maisAntigoEsperando(
  conversas: Array<Parameters<typeof esperaDesde>[0] & { id: string }>,
  agora: Date,
): { id: string; minutos: number; total: number } | null {
  let antigo: { id: string; desde: number } | null = null;
  let total = 0;
  for (const c of conversas) {
    const desde = esperaDesde(c);
    if (desde === null) continue;
    total++;
    const ms = new Date(desde).getTime();
    if (!antigo || ms < antigo.desde) antigo = { id: c.id, desde: ms };
  }
  if (!antigo) return null;
  return { id: antigo.id, minutos: Math.max(0, (agora.getTime() - antigo.desde) / 60_000), total };
}

/** Cópia de `colunasDoCelular` do InboxLayout oficial, sem puxar aquele módulo pesado. */
export function colunasDoCelular(temSelecao: boolean): { lista: string; conversa: string } {
  return {
    lista: temSelecao ? "hidden md:flex" : "flex",
    conversa: temSelecao ? "flex" : "hidden md:flex",
  };
}
