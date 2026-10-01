import "server-only";

/**
 * Clientes da ótica — leituras tipadas do ERP (personalização Ótica Mabe).
 *
 * Cada função resolve a sessão sozinha (`loadAuthUser` = `getUser()`, nunca
 * `getSession()`, + `resolveActiveOrg`), então ninguém lê o ERP sem ser membro
 * autenticado da organização ativa. Todos os membros veem todos os clientes
 * (decisão do Paulo, 01/10/2026). Erro nunca vira exceção: volta
 * `{ ok:false, motivo }` e a tela mostra a frase de `mensagemDoMotivo`.
 */
import { audit } from "@/lib/audit";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";

import { consultarErp } from "./conexao";
import {
  buscaSchema,
  cpfSchema,
  telefoneSchema,
  type BuscaEntrada,
  type ClienteResumo,
  type Ficha,
  type Painel,
  type ResultadoDaBusca,
  type ResultadoErp,
} from "./tipos";

async function orgDoMembro(): Promise<{ orgId: string; userId: string } | null> {
  const user = await loadAuthUser();
  if (!user) return null;
  const org = await resolveActiveOrg(user);
  return org ? { orgId: org.orgId, userId: user.id } : null;
}

// O painel é a consulta mais pesada (alguns segundos pela rede fria) e vem de uma
// view recalculada de hora em hora: 5 min de cache no processo não mostram nada velho
// que a própria view já não mostrasse.
const CINCO_MINUTOS = 5 * 60_000;
const cacheDoPainel = new Map<string, { em: number; valor: Promise<ResultadoErp<Painel>> }>();

export async function painelDeClientes(): Promise<ResultadoErp<Painel>> {
  const membro = await orgDoMembro();
  if (!membro) return { ok: false, motivo: "sem_sessao" };
  const guardado = cacheDoPainel.get(membro.orgId);
  if (guardado && Date.now() - guardado.em < CINCO_MINUTOS) return guardado.valor;

  // Guarda a PROMESSA: duas telas abertas juntas fazem uma consulta só.
  const valor = consultarErp<Painel>(membro.orgId, "select public.mabe_cli_painel() as r", []).then((r) =>
    r.ok ? { ok: true as const, valor: { atualizado_em: r.valor?.atualizado_em ?? null, total: r.valor?.total ?? 0, lojas: r.valor?.lojas ?? [] } } : r,
  );
  cacheDoPainel.set(membro.orgId, { em: Date.now(), valor });
  const resultado = await valor;
  if (!resultado.ok) cacheDoPainel.delete(membro.orgId); // erro não fica 5 min na tela
  return resultado;
}

export async function buscarClientes(entrada: BuscaEntrada): Promise<ResultadoErp<ResultadoDaBusca>> {
  const membro = await orgDoMembro();
  if (!membro) return { ok: false, motivo: "sem_sessao" };
  const p = buscaSchema.safeParse(entrada);
  if (!p.success) return { ok: false, motivo: "entrada_invalida" };
  const b = p.data;
  const r = await consultarErp<ResultadoDaBusca>(
    membro.orgId,
    "select public.mabe_cli_buscar($1,$2,$3,$4,$5,$6) as r",
    // Uma loja, ou a unidade inteira como lista "L10,L13,L15" (o ERP aceita os dois).
    [b.termo, b.loja ?? b.lojas?.join(",") ?? null, b.filtro, b.ordem, b.limite, b.offset],
  );
  if (!r.ok) return r;
  return { ok: true, valor: { total: r.valor?.total ?? 0, limite: b.limite, offset: b.offset, itens: r.valor?.itens ?? [] } };
}

/** Clientes do ERP com esse telefone (pode vir mais de um: família). */
export async function clientesPorTelefone(telefone: string): Promise<ResultadoErp<ClienteResumo[]>> {
  const membro = await orgDoMembro();
  if (!membro) return { ok: false, motivo: "sem_sessao" };
  const p = telefoneSchema.safeParse(telefone);
  if (!p.success) return { ok: false, motivo: "entrada_invalida" };
  const r = await consultarErp<ClienteResumo[]>(membro.orgId, "select public.mabe_cli_por_telefone($1) as r", [p.data]);
  return r.ok ? { ok: true, valor: Array.isArray(r.valor) ? r.valor : [] } : r;
}

/**
 * Ficha completa, ao vivo. `null` = CPF sem nada no ERP. Abrir a ficha deixa 1
 * linha no audit log (LGPD): quem viu qual CPF e quando — sem outro dado do cliente.
 */
export async function fichaDoCliente(cpf: string): Promise<ResultadoErp<Ficha | null>> {
  const membro = await orgDoMembro();
  if (!membro) return { ok: false, motivo: "sem_sessao" };
  const p = cpfSchema.safeParse(cpf);
  if (!p.success) return { ok: false, motivo: "entrada_invalida" };
  const r = await consultarErp<Ficha | null>(membro.orgId, "select public.mabe_cli_ficha($1) as r", [p.data]);
  if (!r.ok) return r;

  void audit({
    action: "mabe.cliente_erp.ficha",
    actorUserId: membro.userId,
    organizationId: membro.orgId,
    resourceType: "cliente_erp",
    // `resource_id` é uuid na tabela: o CPF (o alvo) vai no metadata, e só ele.
    metadata: { cpf: p.data },
  });

  const f = r.valor;
  if (!f || (!f.cadastro && !f.resumo && !(f.os?.length))) return { ok: true, valor: null };
  return {
    ok: true,
    valor: {
      cadastro: f.cadastro ?? null,
      resumo: f.resumo ?? null,
      compras_antigas: f.compras_antigas ?? [],
      os: f.os ?? [],
      contatos_crm: f.contatos_crm ?? [],
      orcamentos: f.orcamentos ?? [],
      indicacoes_feitas: f.indicacoes_feitas ?? [],
    },
  };
}
