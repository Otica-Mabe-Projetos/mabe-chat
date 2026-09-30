/**
 * Motivos de conclusão do atendimento — personalização da Ótica Mabe.
 *
 * PROVISÓRIOS: a lista final é decisão da operação (PRODUCT.md, "Indefinido").
 * O motivo vira etiqueta da conversa (`motivo: …`, filtrável no Inbox) e uma nota
 * interna com quem concluiu. Etiqueta é trim + minúsculas, até 40 caracteres.
 */
export const MOTIVOS_DE_CONCLUSAO = [
  "Agendou exame",
  "Pós-venda resolvido",
  "Enviou orçamento",
  "Sem interesse",
  "Sem resposta do cliente",
  "Fora da área de atendimento",
  "Contato errado ou duplicado",
  "Outro",
] as const;

export type MotivoDeConclusao = (typeof MOTIVOS_DE_CONCLUSAO)[number];

const PREFIXO = "motivo: ";

export function etiquetaDoMotivo(motivo: MotivoDeConclusao): string {
  return `${PREFIXO}${motivo}`.toLowerCase();
}

/** Tira motivos antigos (reconclusão) e põe o novo, sem mexer nas outras etiquetas. */
export function etiquetasComMotivo(atuais: string[], motivo: MotivoDeConclusao): string[] {
  return [...atuais.filter((e) => !e.startsWith(PREFIXO)), etiquetaDoMotivo(motivo)];
}
