/**
 * Lojas (supervisão) — personalização da Ótica Mabe, fora do upstream.
 *
 * Um cartão por loja com o funil do atendimento (Novos → Em atendimento →
 * Esperando resposta → Concluídos hoje) e, ao clicar, o detalhe da loja. As
 * conversas são lidas pela SESSÃO de quem abre a tela: a restrição por loja
 * (supabase/mabe/lojas.sql) vale aqui do mesmo jeito que no Inbox.
 */
import { redirect } from "next/navigation";

import { lerLojas } from "@/components/mabe/lojas/ler";
import { numerosVisiveis } from "@/components/mabe/lojas/lojas";
import { montarPainel, type ConversaDoPainel } from "@/components/mabe/lojas/painel";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";
import { isoLocalComOffset } from "@/lib/tempo/agora";
import { fusoUtilizavel } from "@/lib/tempo/fusos";
import { PainelDeLojas } from "./_painel";

export const metadata = { title: "Lojas" };
export const dynamic = "force-dynamic";

const ATIVAS = ["open", "pending", "claimed", "ai_handling"];
const ENCERRADAS = ["closed", "resolved"];
const CAMPOS =
  "id, channel_session_id, assigned_to_user_id, assigned_to_user_name, awaiting_since, last_inbound_at, last_outbound_at, tags, contacts:contact_id (display_name, name, phone_number, is_anonymized)";

type Linha = Omit<ConversaDoPainel, "contato"> & {
  contacts: { display_name: string | null; name: string | null; phone_number: string | null; is_anonymized: boolean | null } | null;
};

function contato(l: Linha): string {
  if (l.contacts?.is_anonymized) return "Cliente anonimizado";
  return rotuloDoContato(l.contacts);
}

export default async function LojasPainelPage({ searchParams }: { searchParams: Promise<{ loja?: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (ROLE_RANK[activeOrg.role] < ROLE_RANK.manager) redirect("/403");

  const agora = new Date();
  const hojeLocal = isoLocalComOffset(agora, fusoUtilizavel(activeOrg.timezone));
  const inicioDoDia = `${hojeLocal.slice(0, 10)}T00:00:00${hojeLocal.slice(19)}`;

  const db = await createClient();
  // O PostgREST devolve no máximo 1000 linhas por pedido: lê em páginas até acabar.
  // ponytail: teto de 20 páginas (20 mil conversas); acima disso, contar no banco.
  const todas = async (status: string[], desde?: string) => {
    const linhas: unknown[] = [];
    for (let pagina = 0; pagina < 20; pagina++) {
      let q = db
        .from("conversations")
        .select(CAMPOS)
        .eq("organization_id", activeOrg.orgId)
        .eq("is_group", false)
        .in("status", status);
      if (desde) q = q.gte("service_closed_at", desde);
      const { data, error } = await q.order("id").range(pagina * 1000, pagina * 1000 + 999);
      if (error) return { data: linhas, error, cortado: false };
      linhas.push(...(data ?? []));
      if ((data?.length ?? 0) < 1000) return { data: linhas, error: null, cortado: false };
    }
    return { data: linhas, error: null, cortado: true };
  };
  const [cfg, sessoes, ativas, concluidas] = await Promise.all([
    lerLojas(activeOrg.orgId),
    listSelectableChannels(db, activeOrg.orgId),
    todas(ATIVAS),
    todas(ENCERRADAS, inicioDoDia),
  ]);

  const paraPainel = (linhas: unknown[] | null): ConversaDoPainel[] =>
    ((linhas ?? []) as Linha[]).map((l) => ({ ...l, contato: contato(l) }));

  // Só os números que esta pessoa enxerga — mesma regra da trava do banco.
  const permitidos = numerosVisiveis(cfg, user.id, activeOrg.role);
  const visiveis = sessoes.filter((s) => !permitidos || permitidos.includes(s.id));

  const lojas = montarPainel(
    cfg,
    visiveis.map((s) => ({ id: s.id, rotulo: s.display_name, conectado: s.status === "WORKING" })),
    paraPainel(ativas.data),
    paraPainel(concluidas.data),
    agora,
  );
  const { loja } = await searchParams;
  const idioma = user.idioma;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{traduzir("Lojas", idioma)}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {traduzir("Como está o atendimento de cada loja agora. Clique numa loja para ver quem está atendendo e o que está parado.", idioma)}
        </p>
      </header>
      <PainelDeLojas lojas={lojas} selecionada={loja ?? null} erro={!!(ativas.error || concluidas.error || ativas.cortado || concluidas.cortado)} />
    </div>
  );
}
