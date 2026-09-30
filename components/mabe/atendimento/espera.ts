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
