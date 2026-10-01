"use server";
/**
 * Grava as lojas da Mabe — só admin da organização ativa.
 *
 * Mesmo caminho de `definirExigenciaDeMfa` (app/actions/auth/politicaDeMfa.ts):
 * `settings` é jsonb compartilhado com o sistema, então é ler, mesclar só a chave
 * `mabe_lojas` e gravar. O nome do número (`channel_sessions.display_name`) é
 * mantido em dia com a loja, para as telas oficiais mostrarem "L15 · Manaus Centro".
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { supportWriteError } from "@/lib/impersonate/support";
import { listSelectableChannels } from "@/lib/channels/selectable";
import { nomearNumero, numeroDaOrganizacao } from "@/lib/mabe/canais-das-lojas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { lerLojas } from "./ler";
import {
  acessoSchema,
  codigoSchema,
  configLojasSchema,
  lojaPorCodigo,
  lojaSchema,
  lojasDeSettings,
  rotuloDaLoja,
  type ConfigLojas,
} from "./lojas";

export type RespostaLojas = { ok: true } | { ok: false; erro: string };

type Contexto = { orgId: string; userId: string };

async function exigirAdmin(): Promise<Contexto | string> {
  const user = await loadAuthUser();
  if (!user) return "Sua sessão expirou. Entre de novo.";
  if (supportWriteError(user.support)) return "Acompanhamento somente leitura ou encerrado.";
  const org = await resolveActiveOrg(user);
  if (!org) return "Nenhuma empresa ativa.";
  if (org.role !== "admin") return "Só um administrador pode mudar as lojas.";
  return { orgId: org.orgId, userId: user.id };
}

/** Lê, aplica `mudar`, valida e grava `settings.mabe_lojas` (o resto de `settings` fica intacto). */
async function gravar(
  ctx: Contexto,
  mudar: (cfg: ConfigLojas) => ConfigLojas | string,
  oQue: string,
): Promise<{ ok: true; cfg: ConfigLojas; antes: ConfigLojas } | { ok: false; erro: string }> {
  const admin = createAdminClient();
  const { data: atual, error: erroLeitura } = await admin
    .from("organizations")
    .select("settings")
    .eq("id", ctx.orgId)
    .maybeSingle();
  if (erroLeitura) return { ok: false, erro: "Não consegui ler a configuração agora." };

  const settings = (atual?.settings ?? {}) as Record<string, unknown>;
  const antes = lojasDeSettings(settings);
  const resultado = mudar(antes);
  if (typeof resultado === "string") return { ok: false, erro: resultado };
  const valido = configLojasSchema.safeParse(resultado);
  if (!valido.success) return { ok: false, erro: "Confira os campos." };

  const { error } = await admin
    .from("organizations")
    .update({ settings: { ...settings, mabe_lojas: valido.data } })
    .eq("id", ctx.orgId);
  if (error) return { ok: false, erro: "Não consegui salvar agora." };

  await audit({
    action: "org.branding_updated",
    actorUserId: ctx.userId,
    organizationId: ctx.orgId,
    resourceType: "organization",
    resourceId: ctx.orgId,
    metadata: { personalizacao: "lojas_mabe", mudanca: oQue },
  });
  revalidatePath("/app", "layout");
  return { ok: true, cfg: valido.data, antes };
}

/**
 * O nome de cada número segue a loja: "L15 · Manaus Centro"; loja com mais de um
 * número ganha o final do telefone ("L10 · Manaus · 4521") para as opções não
 * ficarem iguais nos seletores.
 */
async function sincronizarNomes(orgId: string, cfg: ConfigLojas, codigos: Iterable<string>): Promise<void> {
  const admin = createAdminClient();
  const canais = await listSelectableChannels(admin, orgId);
  for (const codigo of new Set(codigos)) {
    const loja = lojaPorCodigo(cfg, codigo);
    if (!loja) continue;
    const ids = Object.entries(cfg.numeros).filter(([, c]) => c === codigo).map(([id]) => id);
    for (const id of ids) {
      const final = (canais.find((c) => c.id === id)?.phone_number ?? "").replace(/\D/g, "").slice(-4);
      const nome = ids.length > 1 && final ? `${rotuloDaLoja(loja)} · ${final}` : rotuloDaLoja(loja);
      await nomearNumero(admin, orgId, id, nome.slice(0, 80));
    }
  }
}

/**
 * Com a restrição ligada, a distribuição automática oficial (Responsáveis por
 * número) só pode mandar a conversa para quem vê a loja: os responsáveis de cada
 * número passam a ser as pessoas da loja (não admin nem "todas", que só
 * supervisionam). Ao desligar, os números com loja voltam ao padrão (todos).
 * Grava pela RPC oficial `fn_set_channel_routing`, com a sessão de quem salvou.
 */
async function sincronizarResponsaveis(ctx: Contexto, cfg: ConfigLojas, trocouParaDesligada: boolean): Promise<string | null> {
  if (!cfg.trava && !trocouParaDesligada) return null;
  const { data: membros } = await createAdminClient()
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", ctx.orgId)
    .is("revoked_at", null)
    .not("accepted_at", "is", null)
    .in("role", ["agent", "manager"]);
  const db = await createClient();
  let falhas = 0;
  for (const [sessao, codigo] of Object.entries(cfg.numeros)) {
    const usuarios = cfg.trava
      ? (membros ?? [])
          .filter((m) => !cfg.acesso[m.user_id]?.todas && cfg.acesso[m.user_id]?.lojas.includes(codigo))
          .map((m) => m.user_id)
      : [];
    const { error } = await db.rpc("fn_set_channel_routing", {
      p_org: ctx.orgId,
      p_channel: sessao,
      p_users: usuarios,
      p_reset: !cfg.trava,
    });
    if (error) falhas++;
  }
  return falhas ? `Salvo, mas ${falhas} número(s) não tiveram os responsáveis atualizados. Confira em Configurações › Atendimento.` : null;
}

/** Cadastro das lojas (criar, renomear, desativar). Renomear atualiza o nome dos números dela. */
export async function salvarCadastroDeLojas(entrada: unknown): Promise<RespostaLojas> {
  // Linha acrescentada e deixada em branco não trava o resto das edições.
  const semVazias = Array.isArray(entrada)
    ? entrada.filter((l) => String((l as { codigo?: unknown })?.codigo ?? "").trim() || String((l as { nome?: unknown })?.nome ?? "").trim())
    : entrada;
  const lojas = z.array(lojaSchema).min(1).max(60).safeParse(semVazias);
  if (!lojas.success) return { ok: false, erro: "Confira os campos: toda loja precisa de código e nome." };
  const codigos = lojas.data.map((l) => l.codigo);
  if (new Set(codigos).size !== codigos.length) return { ok: false, erro: "Há duas lojas com o mesmo código." };

  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };

  const r = await gravar(
    ctx,
    (cfg) => {
      const emUso = new Set([...Object.values(cfg.numeros), ...Object.values(cfg.acesso).flatMap((a) => a.lojas)]);
      const sumiu = cfg.lojas.find((l) => emUso.has(l.codigo) && !codigos.includes(l.codigo));
      if (sumiu) {
        return `A loja ${sumiu.codigo} tem número ou pessoas ligados: desative-a em vez de apagar ou trocar o código.`;
      }
      return { ...cfg, lojas: lojas.data };
    },
    "cadastro",
  );
  if (!r.ok) return r;
  const renomeadas = r.cfg.lojas
    .filter((l) => r.antes.lojas.find((a) => a.codigo === l.codigo)?.nome !== l.nome)
    .map((l) => l.codigo);
  await sincronizarNomes(ctx.orgId, r.cfg, renomeadas);
  return { ok: true };
}

/** Liga um número a uma loja (ou desliga, com `null`) e dá ao número o nome da loja. */
export async function definirLojaDoNumero(sessionId: unknown, codigo: unknown): Promise<RespostaLojas> {
  const id = z.string().uuid().safeParse(sessionId);
  const cod = codigoSchema.nullable().safeParse(codigo);
  if (!id.success || !cod.success) return { ok: false, erro: "Número ou loja inválidos." };

  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };

  // O número precisa ser desta organização e ativo ANTES de entrar no mapa.
  if (!(await numeroDaOrganizacao(createAdminClient(), ctx.orgId, id.data))) {
    return { ok: false, erro: "Esse número não existe mais nesta empresa." };
  }

  const r = await gravar(
    ctx,
    (cfg) => {
      const numeros = { ...cfg.numeros };
      if (cod.data === null) {
        delete numeros[id.data];
      } else {
        const loja = lojaPorCodigo(cfg, cod.data);
        if (!loja) return "Essa loja não está cadastrada.";
        numeros[id.data] = loja.codigo;
      }
      return { ...cfg, numeros };
    },
    "numero",
  );
  if (!r.ok) return r;
  const anterior = r.antes.numeros[id.data];
  if (cod.data === null && !(await nomearNumero(createAdminClient(), ctx.orgId, id.data, null))) {
    return { ok: false, erro: "A loja foi salva, mas não consegui renomear o número." };
  }
  await sincronizarNomes(ctx.orgId, r.cfg, [cod.data, anterior].filter((c): c is string => !!c));
  if (r.cfg.trava && cod.data === null && anterior) {
    // Número que saiu da loja volta ao padrão de distribuição.
    await (await createClient()).rpc("fn_set_channel_routing", { p_org: ctx.orgId, p_channel: id.data, p_users: [], p_reset: true });
  }
  const aviso = await sincronizarResponsaveis(ctx, r.cfg, false);
  return aviso ? { ok: false, erro: aviso } : { ok: true };
}

/** Lojas que uma pessoa atende. Só membros desta organização. */
export async function definirAcessoDoMembro(userId: unknown, acesso: unknown): Promise<RespostaLojas> {
  const uid = z.string().uuid().safeParse(userId);
  const a = acessoSchema.safeParse(acesso);
  if (!uid.success || !a.success) return { ok: false, erro: "Pessoa ou lojas inválidas." };

  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };

  const { data: vinculo } = await createAdminClient()
    .from("user_organizations")
    .select("user_id")
    .eq("organization_id", ctx.orgId)
    .eq("user_id", uid.data)
    .maybeSingle();
  if (!vinculo) return { ok: false, erro: "Essa pessoa não é membro desta empresa." };

  const r = await gravar(
    ctx,
    (cfg) => {
      const lojas = [...new Set(a.data.lojas)].filter((c) => lojaPorCodigo(cfg, c));
      return { ...cfg, acesso: { ...cfg.acesso, [uid.data]: { todas: a.data.todas, lojas } } };
    },
    "acesso",
  );
  if (!r.ok) return r;
  const aviso = await sincronizarResponsaveis(ctx, r.cfg, false);
  return aviso ? { ok: false, erro: aviso } : { ok: true };
}

/** Resumo "quem vê quais lojas" para a lista da Equipe (só admin). */
export async function lerResumoDeLojasDaEquipe(): Promise<
  { ok: true; trava: boolean; porPessoa: Record<string, string> } | { ok: false; erro: string }
> {
  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };
  const cfg = await lerLojas(ctx.orgId);
  const porPessoa: Record<string, string> = {};
  for (const [uid, a] of Object.entries(cfg.acesso)) {
    porPessoa[uid] = a.todas ? "Todas as lojas" : a.lojas.join(", ");
  }
  return { ok: true, trava: cfg.trava, porPessoa };
}

/** O que o seletor de loja nos cartões de Conexões precisa: lojas ativas e a loja de cada número. */
export async function lerLojasParaConexoes(): Promise<
  | { ok: true; lojas: Array<{ codigo: string; rotulo: string; ativa: boolean }>; numeros: Record<string, string>; trava: boolean }
  | { ok: false; erro: string }
> {
  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };
  const cfg = await lerLojas(ctx.orgId);
  return {
    ok: true,
    lojas: cfg.lojas.map((l) => ({ codigo: l.codigo, rotulo: rotuloDaLoja(l), ativa: l.ativa })),
    numeros: cfg.numeros,
    trava: cfg.trava,
  };
}

/** O que o diálogo "Lojas que atende" precisa: as lojas ativas e o acesso atual da pessoa. */
export async function lerAcessoDoMembro(
  userId: unknown,
): Promise<{ ok: true; lojas: Array<{ codigo: string; nome: string; cidade: string }>; todas: boolean; marcadas: string[]; trava: boolean } | { ok: false; erro: string }> {
  const uid = z.string().uuid().safeParse(userId);
  if (!uid.success) return { ok: false, erro: "Pessoa inválida." };
  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };
  const cfg = await lerLojas(ctx.orgId);
  const a = cfg.acesso[uid.data];
  return {
    ok: true,
    lojas: cfg.lojas
      .filter((l) => l.ativa || a?.lojas.includes(l.codigo))
      .map((l) => ({ codigo: l.codigo, nome: l.ativa ? l.nome : `${l.nome} (desativada)`, cidade: l.cidade })),
    todas: a?.todas ?? false,
    marcadas: a?.lojas ?? [],
    trava: cfg.trava,
  };
}

/** Liga/desliga a restrição por loja (a trava do banco lê este mesmo campo). */
export async function definirTravaPorLoja(ligada: unknown): Promise<RespostaLojas> {
  const v = z.boolean().safeParse(ligada);
  if (!v.success) return { ok: false, erro: "Valor inválido." };
  const ctx = await exigirAdmin();
  if (typeof ctx === "string") return { ok: false, erro: ctx };
  const r = await gravar(ctx, (cfg) => ({ ...cfg, trava: v.data }), v.data ? "trava_ligada" : "trava_desligada");
  if (!r.ok) return r;
  const aviso = await sincronizarResponsaveis(ctx, r.cfg, r.antes.trava && !r.cfg.trava);
  return aviso ? { ok: false, erro: aviso } : { ok: true };
}
