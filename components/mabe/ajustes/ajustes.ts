/**
 * Ajustes da Mabe — o "mod" da Ótica Mabe, fora do upstream.
 *
 * Moram em `organizations.settings.mabe` (jsonb livre da organização), numa chave
 * só nossa: nenhuma versão oficial lê ou grava ali, então atualizar o sistema não
 * apaga nem muda nada disto. Sem nada gravado, vale o PADRAO (tudo da Mabe ligado).
 * Tela: Configurações › Visual Mabe (`app/app/settings/visual-mabe`).
 */
import { z } from "zod";

import { MOTIVOS_DE_CONCLUSAO } from "@/components/mabe/atendimento/motivos";

/** Tons da paleta da Mabe (PRODUCT.md). A rampa oficial ajusta o contraste de cada um. */
export const TONS = { dourado: "#a8802e", amarelo: "#ffb100", preto: "#14120f" } as const;
export type Tom = keyof typeof TONS;

export const ajustesMabeSchema = z.object({
  /** O interruptor principal. Desligado = o sistema como vem da versão oficial, sem nada da Mabe. */
  ativo: z.boolean(),
  /** Cores da Mabe no app inteiro. */
  visual: z.boolean(),
  /** Qual cor da paleta pinta botões, abas e destaques. */
  tom: z.enum(["dourado", "amarelo", "preto"]),
  /** Logo da Ótica Mabe no topo do menu lateral. */
  logo: z.boolean(),
  /** Mesa do atendente no Inbox para quem é `agent`. Desligado = Inbox oficial para todos. */
  mesa: z.boolean(),
  /** Atendente pode trocar sozinho para o Inbox completo (botão "Modo completo"). */
  atendente_troca: z.boolean(),
  /** Opções do "Concluir atendimento". Cada uma vira a etiqueta `motivo: …`. */
  motivos: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
});

export type AjustesMabe = z.infer<typeof ajustesMabeSchema>;

export const PADRAO: AjustesMabe = {
  ativo: true,
  visual: true,
  tom: "dourado",
  logo: true,
  mesa: true,
  atendente_troca: true,
  motivos: [...MOTIVOS_DE_CONCLUSAO],
};

/** Lê de `organizations.settings`; campo ausente ou inválido cai no padrão, campo a campo. */
export function ajustesMabeDeSettings(settings: unknown): AjustesMabe {
  const gravado = (settings as { mabe?: Record<string, unknown> } | null)?.mabe ?? {};
  const campo = <K extends keyof AjustesMabe>(k: K): AjustesMabe[K] => {
    const r = ajustesMabeSchema.shape[k].safeParse(gravado[k]);
    return r.success ? (r.data as AjustesMabe[K]) : PADRAO[k];
  };
  return {
    ativo: campo("ativo"),
    visual: campo("visual"),
    tom: campo("tom"),
    logo: campo("logo"),
    mesa: campo("mesa"),
    atendente_troca: campo("atendente_troca"),
    motivos: campo("motivos"),
  };
}

/** Se uma parte do mod vale agora: precisa do interruptor principal E do ajuste dela. */
export function vale(a: AjustesMabe, parte: "visual" | "mesa" | "logo"): boolean {
  return a.ativo && a[parte];
}
