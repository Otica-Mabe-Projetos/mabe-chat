import { useEffect, useState } from "react";

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

/**
 * Relógio de quem precisa dele: liga um intervalo só no componente que mostra
 * tempo (e só se `ativo`), em vez de redesenhar a mesa inteira a cada tique.
 */
export function useAgora(ms = 30_000, ativo = true): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    if (!ativo) return;
    const i = setInterval(() => setAgora(new Date()), ms);
    return () => clearInterval(i);
  }, [ms, ativo]);
  return agora;
}

/** Cópia de `colunasDoCelular` do InboxLayout oficial, sem puxar aquele módulo pesado. */
export function colunasDoCelular(temSelecao: boolean): { lista: string; conversa: string } {
  return {
    lista: temSelecao ? "hidden md:flex" : "flex",
    conversa: temSelecao ? "flex" : "hidden md:flex",
  };
}
