import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { listSelectableChannels } from "@/lib/channels/selectable";

/**
 * Personalização Ótica Mabe (components/mabe/lojas): o nome do número de WhatsApp
 * segue a loja dele. Fica em lib/ porque é escrita, não seletor de tela — a leitura
 * continua pela fonte única `listSelectableChannels` (canal excluído não entra).
 */
export async function numeroDaOrganizacao(db: SupabaseClient, orgId: string, sessionId: string): Promise<boolean> {
  const canais = await listSelectableChannels(db, orgId);
  return canais.some((c) => c.id === sessionId);
}

/** Grava o nome do número; `null` volta a mostrar o telefone. Só números ativos desta organização. */
export async function nomearNumero(db: SupabaseClient, orgId: string, sessionId: string, nome: string | null): Promise<boolean> {
  const { data, error } = await db
    .from("channel_sessions")
    .update({ display_name: nome })
    .eq("organization_id", orgId)
    .eq("id", sessionId)
    .is("archived_at", null)
    .select("id");
  return !error && (data?.length ?? 0) === 1;
}
