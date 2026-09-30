/**
 * Lojas da Ótica Mabe — personalização fora do upstream.
 *
 * Uma organização só; cada número de WhatsApp (channel_sessions) pertence a uma
 * loja. Tudo mora em `organizations.settings.mabe_lojas` (chave só nossa, que
 * nenhuma versão oficial lê ou grava). O rótulo "L15 · Manaus Centro" também é
 * copiado para `channel_sessions.display_name`, que é o nome que as telas
 * oficiais (Conexões, filtro da Inbox, Responsáveis) já mostram.
 */
import { z } from "zod";

export const codigoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{1,8}$/, "Código com até 8 letras ou números (ex.: L15).");

export const lojaSchema = z.object({
  codigo: codigoSchema,
  nome: z.string().trim().min(1).max(40),
  cidade: z.string().trim().max(40).default(""),
  ativa: z.boolean().default(true),
});
export type Loja = z.infer<typeof lojaSchema>;

export const acessoSchema = z.object({
  todas: z.boolean().default(false),
  lojas: z.array(codigoSchema).max(50).default([]),
});
export type Acesso = z.infer<typeof acessoSchema>;

export const configLojasSchema = z.object({
  lojas: z.array(lojaSchema).max(60),
  /** channel_session_id → código da loja. */
  numeros: z.record(z.string().uuid(), codigoSchema),
  /** user_id → lojas que a pessoa atende. */
  acesso: z.record(z.string().uuid(), acessoSchema),
  /** Restrição por loja ligada: quem não tem a loja do número não vê a conversa. */
  trava: z.boolean(),
});
export type ConfigLojas = z.infer<typeof configLojasSchema>;

/** As lojas da Ótica Mabe (lista do Paulo, 30/09/2026). Editáveis na tela. */
export const LOJAS_PADRAO: Loja[] = [
  { codigo: "L01", nome: "José Bonifácio", cidade: "Belém", ativa: true },
  { codigo: "L02", nome: "Cidade Nova", cidade: "Ananindeua", ativa: true },
  { codigo: "L03", nome: "Augusto Montenegro", cidade: "Belém", ativa: true },
  { codigo: "L04", nome: "Telégrafo", cidade: "Belém", ativa: true },
  { codigo: "L05", nome: "Ananindeua", cidade: "Ananindeua", ativa: true },
  { codigo: "L06", nome: "Marambaia", cidade: "Belém", ativa: true },
  { codigo: "L07", nome: "Castanhal", cidade: "Castanhal", ativa: true },
  { codigo: "L08", nome: "Jurunas", cidade: "Belém", ativa: true },
  { codigo: "L09", nome: "Marabá", cidade: "Marabá", ativa: true },
  { codigo: "L10", nome: "Manaus", cidade: "Manaus", ativa: true },
  { codigo: "L11", nome: "São Luís", cidade: "São Luís", ativa: true },
  { codigo: "L12", nome: "Capanema", cidade: "Capanema", ativa: true },
  { codigo: "L13", nome: "Manoa", cidade: "Manaus", ativa: true },
  { codigo: "L14", nome: "Fortaleza", cidade: "Fortaleza", ativa: true },
  { codigo: "L15", nome: "Manaus Centro", cidade: "Manaus", ativa: true },
  { codigo: "L99", nome: "Ações", cidade: "", ativa: true },
  { codigo: "BASE", nome: "Mabe Base", cidade: "", ativa: true },
];

export const CONFIG_PADRAO: ConfigLojas = { lojas: LOJAS_PADRAO, numeros: {}, acesso: {}, trava: false };

/** Lê de `organizations.settings`; parte ausente ou inválida cai no padrão, parte a parte. */
export function lojasDeSettings(settings: unknown): ConfigLojas {
  const cru = (settings as { mabe_lojas?: Record<string, unknown> } | null)?.mabe_lojas ?? {};
  const parte = <K extends keyof ConfigLojas>(k: K): ConfigLojas[K] => {
    const r = configLojasSchema.shape[k].safeParse(cru[k]);
    return r.success ? (r.data as ConfigLojas[K]) : CONFIG_PADRAO[k];
  };
  const lojas = parte("lojas");
  return {
    lojas: lojas.length ? lojas : LOJAS_PADRAO,
    numeros: parte("numeros"),
    acesso: parte("acesso"),
    trava: parte("trava"),
  };
}

/** "L15 · Manaus Centro" — o nome que o número passa a ter no sistema inteiro (máx. 80). */
export function rotuloDaLoja(l: Pick<Loja, "codigo" | "nome">): string {
  return `${l.codigo} · ${l.nome}`.slice(0, 80);
}

export function lojaPorCodigo(cfg: ConfigLojas, codigo: string | null | undefined): Loja | null {
  return codigo ? (cfg.lojas.find((l) => l.codigo === codigo) ?? null) : null;
}

/** A loja de um número, se ele tiver uma. */
export function lojaDoNumero(cfg: ConfigLojas, sessionId: string): Loja | null {
  return lojaPorCodigo(cfg, cfg.numeros[sessionId]);
}

/**
 * Quais lojas a pessoa enxerga. `null` = todas (admin, "Todas as lojas" ou
 * restrição desligada). Mesma regra da trava do banco (supabase/mabe/lojas.sql).
 */
export function lojasVisiveis(cfg: ConfigLojas, userId: string, papel: string): string[] | null {
  if (!cfg.trava || papel === "admin") return null;
  const a = cfg.acesso[userId];
  if (a?.todas) return null;
  return a?.lojas ?? [];
}

/** Os números que a pessoa enxerga (`null` = todos), pela mesma regra. */
export function numerosVisiveis(cfg: ConfigLojas, userId: string, papel: string): string[] | null {
  const lojas = lojasVisiveis(cfg, userId, papel);
  if (lojas === null) return null;
  return Object.entries(cfg.numeros)
    .filter(([, codigo]) => lojas.includes(codigo))
    .map(([id]) => id);
}
