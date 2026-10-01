/**
 * Clientes da ótica (base do ERP) — personalização Ótica Mabe, fora do upstream.
 *
 * Tipos do que as funções `public.mabe_cli_*` do ERP devolvem (contrato em
 * docs/mabe/ESPEC-CLIENTES-DA-OTICA.md §2) e a validação das ENTRADAS, que é
 * pura para poder ser testada sem banco. Sem `server-only`: a tela (cliente)
 * reaproveita os tipos e os vocabulários de filtro e ordem.
 */
import { z } from "zod";

import { soDigitos } from "./formato";

export const FILTROS = [
  "todos",
  "os_abertas",
  "prontas",
  "aniversariantes",
  "sem_compra_12m",
  "ativos_12m",
  "novos_30d",
  "sem_compra",
] as const;
export type Filtro = (typeof FILTROS)[number];

export const ORDENS = ["recentes", "gasto", "nome", "compras"] as const;
export type Ordem = (typeof ORDENS)[number];

/** Valor de `loja` que pede os clientes sem loja. */
export const SEM_LOJA = "sem_loja";

/** Itens por página da lista. */
export const POR_PAGINA = 50;

/**
 * Termo da busca: com 3 ou mais dígitos e nada além de dígito e máscara, vira só
 * os dígitos (CPF/telefone digitado com pontuação); senão é nome. Vazio = todos.
 */
export function normalizarTermo(termo: string | null | undefined): string | null {
  const t = (termo ?? "").trim().replace(/\s+/g, " ");
  if (!t) return null;
  if (/^[\d\s.\-()/+]+$/.test(t)) {
    const d = soDigitos(t);
    if (d.length >= 3) return d;
  }
  return t;
}

const lojaSchema = z
  .string()
  .trim()
  .transform((v) => (v === SEM_LOJA ? v : v.toUpperCase()))
  .refine((v) => v === SEM_LOJA || /^L\d{2}$/.test(v), "Loja inválida.");

export const buscaSchema = z.object({
  termo: z.string().max(100).nullish().transform(normalizarTermo),
  loja: lojaSchema.nullish().transform((v) => v ?? null),
  filtro: z.enum(FILTROS).default("todos"),
  ordem: z.enum(ORDENS).default("recentes"),
  limite: z.number().int().min(1).max(200).default(POR_PAGINA),
  offset: z.number().int().min(0).max(1_000_000).default(0),
});
export type Busca = z.output<typeof buscaSchema>;
export type BuscaEntrada = z.input<typeof buscaSchema>;

/** Telefone em qualquer formato: só os dígitos, de 8 a 15. */
export const telefoneSchema = z
  .string()
  .max(40)
  .transform(soDigitos)
  .refine((d) => d.length >= 8 && d.length <= 15, "Telefone inválido.");

/** CPF com ou sem máscara: só os dígitos (o ERP também aceita sem zero à esquerda). */
export const cpfSchema = z
  .string()
  .max(20)
  .refine((v) => /^[\d\s.\-/]+$/.test(v), "CPF inválido.")
  .transform(soDigitos)
  .refine((d) => d.length >= 3 && d.length <= 14, "CPF inválido.");

/**
 * Estado da lista na URL (`?q=&loja=&filtro=&ordem=&pagina=`). Valor estranho na
 * URL cai no padrão em vez de virar erro: link velho ou editado à mão ainda abre.
 */
export function lerEstadoDaUrl(p: Record<string, string | string[] | undefined>): {
  q: string;
  loja: string | null;
  filtro: Filtro;
  ordem: Ordem;
  pagina: number;
} {
  const um = (k: string) => {
    const v = p[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const loja = lojaSchema.safeParse(um("loja"));
  const filtro = z.enum(FILTROS).safeParse(um("filtro"));
  const ordem = z.enum(ORDENS).safeParse(um("ordem"));
  const pagina = Number.parseInt(um("pagina"), 10);
  return {
    q: um("q").slice(0, 100),
    loja: loja.success ? loja.data : null,
    filtro: filtro.success ? filtro.data : "todos",
    ordem: ordem.success ? ordem.data : "recentes",
    pagina: Number.isFinite(pagina) && pagina >= 1 ? Math.min(pagina, 20_000) : 1,
  };
}

// ── O que o ERP devolve ─────────────────────────────────────────────────────

export interface LojaDoPainel {
  loja: string | null;
  clientes: number;
  compradores: number;
  ativos_12m: number;
  sem_compra_12m: number;
  novos_30d: number;
  os_abertas: number;
  os_prontas: number;
  aniversariantes_mes: number;
  total_gasto: number;
  ticket_medio: number | null;
}

export interface Painel {
  atualizado_em: string | null;
  total: number;
  lojas: LojaDoPainel[];
}

export interface ClienteResumo {
  cpf: string;
  nome: string | null;
  telefone1: string | null;
  telefone2: string | null;
  telefone3: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  data_nascimento: string | null;
  loja_original: string | null;
  cadastrado: boolean;
  loja: string | null;
  compras: number;
  total_gasto: number;
  primeira_compra: string | null;
  ultima_compra: string | null;
  os_abertas: number;
  os_prontas: number;
  gerado_em: string | null;
}

/** Um cliente achado pelo telefone da conversa, com o rótulo da loja ("L05 · …"). */
export type ClienteDaConversa = ClienteResumo & { loja_rotulo: string | null };

export interface ResultadoDaBusca {
  total: number;
  limite: number;
  offset: number;
  itens: ClienteResumo[];
}

export interface Cadastro {
  cpf: string;
  nome: string | null;
  telefone1: string | null;
  telefone2: string | null;
  telefone3: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  data_nascimento: string | null;
  loja_original: string | null;
  observacao: string | null;
  origem: string | null;
  created_at: string | null;
}

export interface CompraAntiga {
  data: string | null;
  loja: string | null;
  loja_codigo_antigo: string | null;
  valor: number | null;
  codigo: string | null;
  observacao: string | null;
  cancelada: boolean | null;
}

export interface Receita {
  od_esf_longe: number | string | null;
  od_cilindrico: number | string | null;
  od_eixo: number | string | null;
  od_adicao: number | string | null;
  od_esf_perto: number | string | null;
  od_prisma: number | string | boolean | null;
  od_prisma_valor: number | string | null;
  od_prisma_base: string | null;
  oe_esf_longe: number | string | null;
  oe_cilindrico: number | string | null;
  oe_eixo: number | string | null;
  oe_adicao: number | string | null;
  oe_esf_perto: number | string | null;
  oe_prisma: number | string | boolean | null;
  oe_prisma_valor: number | string | null;
  oe_prisma_base: string | null;
  dnp_od: number | string | null;
  dnp_oe: number | string | null;
  altura_od: number | string | null;
  altura_oe: number | string | null;
  created_at: string | null;
}

export interface OrdemDeServico {
  numero: string | number;
  loja: string | null;
  loja_nome: string | null;
  entrada: string | null;
  previsao: string | null;
  status_index: number | null;
  status_em: string | null;
  cancelado: boolean | null;
  valor_total: number | null;
  valor_entrada: number | null;
  servico: string | null;
  tipo_lente: string | null;
  nome_lente: string | null;
  faixa_lente: string | null;
  laboratorio: string | null;
  tecnico: string | null;
  pendencia: string | null;
  meio_contato: string | null;
  indicacao_otica: string | null;
  armacao_origem: string | null;
  eh_garantia: boolean | null;
  garantia: { origem: string | null; setor: string | null; descricao: string | null; comentario: string | null; armacao: string | null } | null;
  ocorrencia_aberta: boolean | null;
  pos_venda: {
    status: string | null;
    nota: string | null;
    contato_4d: string | null;
    nota_4d: string | null;
    contato_30d: string | null;
    nota_30d: string | null;
  } | null;
  renegociacao: { status: string | null; nota: string | null; proximo_contato: string | null } | null;
  armacao: { marca: string | null; modelo: string | null; referencia: string | null; cor: string | null; categoria: string | null } | null;
  receita: Receita | null;
  produtos: { nome: string | null; valor: number | null }[] | null;
  pagamentos: { data: string | null; forma: string | null; parcelas: number | null; valor: number | null }[] | null;
  historico: { status_index: number | null; em: string | null; nota: string | null }[] | null;
  ocorrencias: { motivo: string | null; descricao: string | null; resolvida: boolean | null; em: string | null }[] | null;
  contatos_pos_venda: { tipo: string | null; status: string | null; nota: string | null; em: string | null }[] | null;
  nps: { nota: number | null; motivos: string[] | string | null; comentario: string | null; em: string | null } | null;
}

export interface Ficha {
  cadastro: Cadastro | null;
  resumo: ClienteResumo | null;
  compras_antigas: CompraAntiga[];
  os: OrdemDeServico[];
  contatos_crm: { status: string | null; nota: string | null; proximo_contato: string | null; em: string | null }[];
  orcamentos: {
    em: string | null;
    loja: string | null;
    descricao: string | null;
    valor_estimado: number | null;
    validade: string | null;
    status: string | null;
    motivo_perda: string | null;
    convertido_em: string | null;
  }[];
  indicacoes_feitas: { em: string | null; loja: string | null; recompensa: string | number | null; pago: boolean | null; pago_em: string | null }[];
}

/**
 * Por que a leitura não deu certo — a tela traduz em frase (`mensagemDoMotivo`).
 * Nunca carrega detalhe técnico (host, usuário, mensagem do Postgres).
 */
export type MotivoErp =
  | "sem_sessao"
  | "entrada_invalida"
  | "sem_conexao"
  | "conexao_desativada"
  | "cifra_indisponivel"
  | "host_bloqueado"
  | "sem_permissao"
  | "lento"
  | "indisponivel";

export type ResultadoErp<T> = { ok: true; valor: T } | { ok: false; motivo: MotivoErp };

export function mensagemDoMotivo(motivo: MotivoErp): string {
  switch (motivo) {
    case "sem_sessao":
      return "Sua sessão terminou. Entre de novo para ver os clientes.";
    case "entrada_invalida":
      return "A busca tem algum valor inválido. Confira o que foi digitado.";
    case "sem_conexao":
      return "A base de clientes da ótica não está ligada nesta empresa.";
    case "conexao_desativada":
      return "A ligação com a base de clientes da ótica está desativada.";
    case "cifra_indisponivel":
      return "O servidor não consegue abrir a senha da base da ótica (falta a chave de cifra).";
    case "host_bloqueado":
      return "O endereço da base da ótica não está acessível agora.";
    case "sem_permissao":
      return "A base da ótica recusou a leitura (permissão).";
    case "lento":
      return "A base da ótica demorou demais para responder. Tente de novo em instantes.";
    case "indisponivel":
      return "Não consegui falar com a base da ótica agora. Tente de novo em instantes.";
  }
}
