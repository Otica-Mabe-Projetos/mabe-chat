/**
 * Painel de supervisão por loja — personalização da Ótica Mabe. Função pura: recebe
 * as conversas já lidas (pela sessão da pessoa, então a trava por loja vale) e
 * monta o funil de cada loja. A tela é app/app/lojas.
 */
import { esperaDesde } from "@/components/mabe/atendimento/espera";
import type { ConfigLojas } from "./lojas";

export type ConversaDoPainel = {
  id: string;
  channel_session_id: string;
  assigned_to_user_id: string | null;
  assigned_to_user_name: string | null;
  awaiting_since: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  tags: string[] | null;
  contato: string;
};

export type NumeroDoPainel = { id: string; rotulo: string; conectado: boolean };

export type Parado = { id: string; numeroId: string; contato: string; atendente: string | null; esperaMin: number };

export type LojaNoPainel = {
  codigo: string;
  nome: string;
  cidade: string;
  numeros: NumeroDoPainel[];
  novos: number;
  emAtendimento: number;
  esperando: number;
  maiorEsperaMin: number;
  concluidosHoje: number;
  motivos: Array<{ motivo: string; n: number }>;
  atendentes: Array<{ nome: string; emAtendimento: number; esperando: number; maiorEsperaMin: number }>;
  parados: Parado[];
};

const PREFIXO_MOTIVO = "motivo: ";
export const SEM_LOJA = "—";

function minutosDesde(iso: string, agora: Date): number {
  return Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000));
}

export function montarPainel(
  cfg: ConfigLojas,
  numeros: NumeroDoPainel[],
  ativas: ConversaDoPainel[],
  concluidasHoje: ConversaDoPainel[],
  agora: Date,
): LojaNoPainel[] {
  const lojaDoNumero = (id: string) => cfg.numeros[id] ?? SEM_LOJA;
  const lojas = new Map<string, LojaNoPainel>();
  const loja = (codigo: string): LojaNoPainel => {
    let l = lojas.get(codigo);
    if (!l) {
      const cad = cfg.lojas.find((x) => x.codigo === codigo);
      l = {
        codigo,
        nome: cad?.nome ?? "Sem loja",
        cidade: cad?.cidade ?? "",
        numeros: [],
        novos: 0,
        emAtendimento: 0,
        esperando: 0,
        maiorEsperaMin: 0,
        concluidosHoje: 0,
        motivos: [],
        atendentes: [],
        parados: [],
      };
      lojas.set(codigo, l);
    }
    return l;
  };

  for (const n of numeros) loja(lojaDoNumero(n.id)).numeros.push(n);

  const porAtendente = new Map<string, Map<string, LojaNoPainel["atendentes"][number]>>();
  for (const c of ativas) {
    const l = loja(lojaDoNumero(c.channel_session_id));
    const desde = esperaDesde(c);
    const espera = desde ? minutosDesde(desde, agora) : null;
    if (c.assigned_to_user_id) l.emAtendimento++;
    else l.novos++;
    if (espera !== null) {
      l.esperando++;
      l.maiorEsperaMin = Math.max(l.maiorEsperaMin, espera);
      l.parados.push({
        id: c.id,
        numeroId: c.channel_session_id,
        contato: c.contato,
        atendente: c.assigned_to_user_name,
        esperaMin: espera,
      });
    }
    if (c.assigned_to_user_id) {
      const mapa = porAtendente.get(l.codigo) ?? new Map();
      porAtendente.set(l.codigo, mapa);
      const a = mapa.get(c.assigned_to_user_id) ?? {
        nome: c.assigned_to_user_name ?? "Atendente",
        emAtendimento: 0,
        esperando: 0,
        maiorEsperaMin: 0,
      };
      a.emAtendimento++;
      if (espera !== null) {
        a.esperando++;
        a.maiorEsperaMin = Math.max(a.maiorEsperaMin, espera);
      }
      mapa.set(c.assigned_to_user_id, a);
    }
  }

  const motivosPorLoja = new Map<string, Map<string, number>>();
  for (const c of concluidasHoje) {
    const l = loja(lojaDoNumero(c.channel_session_id));
    l.concluidosHoje++;
    const m = (c.tags ?? []).find((t) => t.startsWith(PREFIXO_MOTIVO))?.slice(PREFIXO_MOTIVO.length) ?? "sem motivo";
    const mapa = motivosPorLoja.get(l.codigo) ?? new Map();
    mapa.set(m, (mapa.get(m) ?? 0) + 1);
    motivosPorLoja.set(l.codigo, mapa);
  }

  for (const l of lojas.values()) {
    l.parados.sort((a, b) => b.esperaMin - a.esperaMin);
    l.parados = l.parados.slice(0, 10);
    l.atendentes = [...(porAtendente.get(l.codigo)?.values() ?? [])].sort((a, b) => b.emAtendimento - a.emAtendimento);
    l.motivos = [...(motivosPorLoja.get(l.codigo)?.entries() ?? [])]
      .map(([motivo, n]) => ({ motivo, n }))
      .sort((a, b) => b.n - a.n);
  }

  // Na ordem do cadastro (L01, L02…); "Sem loja" por último.
  const ordem = (codigo: string) => {
    const i = cfg.lojas.findIndex((x) => x.codigo === codigo);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...lojas.values()].sort((a, b) => ordem(a.codigo) - ordem(b.codigo));
}
