/**
 * Rótulos do ERP da Ótica Mabe, copiados para cá (personalização Ótica Mabe).
 * Valor desconhecido nunca some: vira texto legível ("nao_quer" → "Nao quer").
 */
import type { Filtro, Ordem } from "./tipos";

/** Status da OS pelo índice (0..4). */
export const STATUS_DA_OS = ["Recebido", "Aguardando lente", "Em montagem", "Pronta para retirada", "Entregue"] as const;

export const POS_VENDA: Record<string, string> = {
  ligado: "Ligado",
  sem_resposta: "Sem resposta",
  confirmado: "Confirmado",
};

export const RENEGOCIACAO: Record<string, string> = {
  contatado: "Contatado",
  renegociado: "Renegociado",
  sem_resposta: "Sem resposta",
};

export const CONTATO_CRM: Record<string, string> = {
  contatado: "Contatado",
  nao_atendeu: "Não atendeu",
  numero_incorreto: "Número incorreto",
  nao_quer_contato: "Não quer contato",
  respondeu: "Respondeu",
  objecao: "Objeção",
  agendado: "Agendado",
  convertido: "Convertido",
};

export const FORMA_DE_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  dinheiro: "Dinheiro",
  ume: "Crediário UME",
  link: "Link de pagamento",
};

export const ROTULO_DO_FILTRO: Record<Filtro, string> = {
  todos: "Todos",
  os_abertas: "OS em andamento",
  prontas: "Prontas para retirada",
  aniversariantes: "Aniversariantes do mês",
  ativos_12m: "Ativos (12 meses)",
  novos_30d: "Novos (30 dias)",
  sem_compra_12m: "Sem compra há 12 meses",
  sem_compra: "Nunca compraram",
};

export const ROTULO_DA_ORDEM: Record<Ordem, string> = {
  recentes: "Compra mais recente",
  gasto: "Maior gasto",
  compras: "Mais compras",
  nome: "Nome (A–Z)",
};

/** "nao_quer_contato" → "Nao quer contato" (para valor que não está no mapa). */
export function humanizar(v: string | null | undefined): string {
  const t = (v ?? "").replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";
}

export function rotulo(mapa: Record<string, string>, v: string | null | undefined): string {
  return (v && mapa[v]) || humanizar(v);
}

export function statusDaOs(i: number | null | undefined): string {
  return typeof i === "number" && STATUS_DA_OS[i] ? STATUS_DA_OS[i] : "—";
}
