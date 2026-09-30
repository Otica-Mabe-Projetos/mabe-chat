/**
 * Configurações › Lojas — personalização da Ótica Mabe (fora do upstream).
 *
 * Uma organização só com todas as lojas: aqui se cadastra cada loja, se diz de
 * qual loja é cada número de WhatsApp e quem atende cada loja. Os dados moram em
 * `organizations.settings.mabe_lojas` (components/mabe/lojas), chave que nenhuma
 * versão oficial toca. A restrição por loja é aplicada no banco por
 * supabase/mabe/lojas.sql.
 */
import { redirect } from "next/navigation";

import { lerLojas } from "@/components/mabe/lojas/ler";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelaDeLojas, type Membro, type NumeroDaLoja } from "./_client";

export const metadata = { title: "Lojas" };
export const dynamic = "force-dynamic";

export default async function LojasPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  if (activeOrg.role !== "admin") redirect("/403");
  const orgId = activeOrg.orgId;
  const admin = createAdminClient();

  const [config, sessoes, politicas, responsaveis, vinculos] = await Promise.all([
    lerLojas(orgId),
    listSelectableChannels(admin, orgId),
    admin.from("channel_routing_policies").select("id, channel_session_id").eq("organization_id", orgId),
    admin.from("channel_routing_responsibles").select("policy_id").eq("organization_id", orgId),
    admin
      .from("user_organizations")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .is("revoked_at", null)
      .not("accepted_at", "is", null),
  ]);

  // Quantos responsáveis cada número tem: sem política = todos os atendentes.
  const porPolitica = new Map<string, number>();
  for (const r of responsaveis.data ?? []) porPolitica.set(r.policy_id, (porPolitica.get(r.policy_id) ?? 0) + 1);
  const responsaveisDoNumero = new Map<string, number>();
  for (const p of politicas.data ?? []) responsaveisDoNumero.set(p.channel_session_id, porPolitica.get(p.id) ?? 0);

  const numeros: NumeroDaLoja[] = sessoes.map((s) => ({
    id: s.id,
    telefone: s.phone_number,
    nome: s.display_name,
    status: s.status,
    responsaveis: responsaveisDoNumero.has(s.id) ? (responsaveisDoNumero.get(s.id) ?? 0) : null,
  }));

  const membros: Membro[] = await Promise.all(
    (vinculos.data ?? []).map(async (v) => {
      const { data } = await admin.auth.admin.getUserById(v.user_id);
      const u = data?.user;
      return {
        id: v.user_id,
        papel: v.role,
        nome: (u?.user_metadata?.full_name as string | undefined) || u?.email || v.user_id.slice(0, 8),
        email: u?.email ?? null,
      };
    }),
  );
  membros.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const idioma = user.idioma;
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{traduzir("Lojas", idioma)}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {traduzir(
            "Todas as lojas numa empresa só: de qual loja é cada número de WhatsApp e quem atende cada loja.",
            idioma,
          )}
        </p>
      </header>
      <TelaDeLojas config={config} numeros={numeros} membros={membros} />
    </div>
  );
}
