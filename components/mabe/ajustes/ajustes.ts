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

export const ajustesMabeSchema = z.object({
  /** Cores da Mabe no app inteiro. Desligado = visual original do sistema. */
  visual: z.boolean(),
  /** Mesa do atendente no Inbox para quem é `agent`. Desligado = Inbox oficial para todos. */
  mesa: z.boolean(),
  /** Atendente pode trocar sozinho para o Inbox completo (botão "Modo completo"). */
  atendente_troca: z.boolean(),
  /** Opções do "Concluir atendimento". Cada uma vira a etiqueta `motivo: …`. */
  motivos: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
});

export type AjustesMabe = z.infer<typeof ajustesMabeSchema>;

export const PADRAO: AjustesMabe = {
  visual: true,
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
    visual: campo("visual"),
    mesa: campo("mesa"),
    atendente_troca: campo("atendente_troca"),
    motivos: campo("motivos"),
  };
}
