/**
 * Formatadores da tela "Clientes da ótica" — personalização Ótica Mabe.
 * Puros (sem rede, sem relógio implícito): quem precisa de "hoje" recebe por parâmetro.
 */

export function soDigitos(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

/** 000.000.000-00; CPF com menos dígitos (zero à esquerda perdido no sistema antigo) ganha os zeros. */
export function formatarCpf(cpf: string | null | undefined): string {
  const d = soDigitos(cpf);
  if (!d) return "—";
  if (d.length > 11) return d;
  const c = d.padStart(11, "0");
  return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
}

/** Só os dígitos nacionais (DDD + número), sem o 55 do país. */
export function telefoneNacional(tel: string | null | undefined): string {
  const d = soDigitos(tel);
  return d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
}

/**
 * DDD de cada loja. Muito telefone do sistema antigo foi salvo sem DDD ("98573-5522"):
 * o cliente quase sempre é da região da loja onde comprou, então completamos com o DDD dela.
 */
export const DDD_DA_LOJA: Record<string, string> = {
  L01: "91", L02: "91", L03: "91", L04: "91", L05: "91", L06: "91", L07: "91", L08: "91",
  L09: "94", L10: "92", L11: "98", L12: "91", L13: "92", L14: "85", L15: "92",
};

/**
 * Telefone com DDD (só dígitos nacionais). Sem DDD e com loja conhecida, completa com o DDD
 * da loja (`presumido`); celular de 8 dígitos ganha o 9. `null` se não dá para discar.
 */
export function telefoneComDdd(
  tel: string | null | undefined,
  loja?: string | null,
): { nacional: string; presumido: boolean } | null {
  const d = telefoneNacional(tel).replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) return { nacional: d, presumido: false };
  const ddd = loja ? DDD_DA_LOJA[loja] : undefined;
  if (!ddd) return null;
  if (d.length === 9 && d.startsWith("9")) return { nacional: ddd + d, presumido: true };
  if (d.length === 8) return { nacional: ddd + (/^[6-9]/.test(d) ? `9${d}` : d), presumido: true };
  return null;
}

/** (92) 99999-9999 / (92) 9999-9999; sem DDD usa o da loja; formato desconhecido volta como veio. */
export function formatarTelefone(tel: string | null | undefined, loja?: string | null): string {
  const d = telefoneComDdd(tel, loja)?.nacional ?? telefoneNacional(tel);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return (tel ?? "").trim() || "—";
}

/** Telefone pronto para abrir conversa (+55DDDNUMERO), ou `null` se não dá para discar. */
export function telefoneParaConversa(tel: string | null | undefined, loja?: string | null): string | null {
  const t = telefoneComDdd(tel, loja);
  return t ? `+55${t.nacional}` : null;
}

const MOEDA = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function moeda(v: number | string | null | undefined): string {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? MOEDA.format(n) : "—";
}

const INTEIRO = new Intl.NumberFormat("pt-BR");

export function inteiro(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? INTEIRO.format(v) : "0";
}

/** "AAAA-MM-DD" do valor: data pura sai como está; instante é lido no fuso dado. */
function diaDe(valor: string, fuso: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  // en-CA formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** dd/mm/aaaa. Data pura ("2026-09-30") nunca anda um dia por causa de fuso. */
export function dataBr(valor: string | null | undefined, fuso = "America/Sao_Paulo"): string {
  if (!valor) return "—";
  const dia = diaDe(valor, fuso);
  if (!dia) return "—";
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

/** HH:MM no fuso dado. */
export function horaBr(valor: string | null | undefined, fuso = "America/Sao_Paulo"): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  // HH:MM é igual em qualquer idioma; en-GB só porque dá 24 h com zero à esquerda.
  return new Intl.DateTimeFormat("en-GB", { timeZone: fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
}

function partes(dia: string): [number, number, number] {
  const [a, m, d] = dia.slice(0, 10).split("-").map(Number);
  return [a ?? 0, m ?? 0, d ?? 0];
}

/** Idade em anos completos em `hoje` (AAAA-MM-DD). `null` se a data não serve. */
export function idade(nascimento: string | null | undefined, hoje: string): number | null {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}/.test(nascimento)) return null;
  const [an, mn, dn] = partes(nascimento);
  const [ah, mh, dh] = partes(hoje);
  let anos = ah - an;
  if (mh < mn || (mh === mn && dh < dn)) anos -= 1;
  return anos >= 0 && anos < 130 ? anos : null;
}

/** Faz aniversário no mês de `hoje`? */
export function aniversarioNoMes(nascimento: string | null | undefined, hoje: string): boolean {
  if (!nascimento || !/^\d{4}-\d{2}-\d{2}/.test(nascimento)) return false;
  return nascimento.slice(5, 7) === hoje.slice(5, 7);
}

/** "há 3 meses", "há 1 ano e 2 meses", "este mês" — distância em meses de calendário até `hoje`. */
export function haQuanto(data: string | null | undefined, hoje: string): string {
  if (!data || !/^\d{4}-\d{2}-\d{2}/.test(data)) return "";
  const [a, m, d] = partes(data);
  const [ah, mh, dh] = partes(hoje);
  let meses = (ah - a) * 12 + (mh - m);
  if (dh < d) meses -= 1;
  if (meses < 0) return "";
  if (meses === 0) return "há menos de 1 mês";
  if (meses < 12) return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const txtAnos = anos === 1 ? "1 ano" : `${anos} anos`;
  if (!resto) return `há ${txtAnos}`;
  return `há ${txtAnos} e ${resto === 1 ? "1 mês" : `${resto} meses`}`;
}

/** Hoje (AAAA-MM-DD) no fuso dado. */
export function hojeNoFuso(fuso: string, agora = new Date()): string {
  return diaDe(agora.toISOString(), fuso) ?? agora.toISOString().slice(0, 10);
}

/** Grau da receita: +1,25 / -0,50 / 0,00; texto que não é número volta como veio. */
export function grau(v: number | string | null | undefined, sinal = true): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  const txt = Math.abs(n).toFixed(2).replace(".", ",");
  if (!sinal) return n < 0 ? `-${txt}` : txt;
  return n > 0 ? `+${txt}` : n < 0 ? `-${txt}` : txt;
}
