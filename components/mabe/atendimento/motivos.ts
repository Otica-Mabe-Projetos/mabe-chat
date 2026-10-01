/**
 * Motivos de conclusão do atendimento — personalização da Ótica Mabe.
 *
 * Esta é a lista PADRÃO; a da empresa se edita em Configurações › Visual Mabe
 * (components/mabe/ajustes).
 * O motivo vira etiqueta da conversa (`motivo: …`, filtrável no Inbox) e uma nota
 * interna com quem concluiu. Etiqueta é trim + minúsculas, até 40 caracteres.
 */
export const MOTIVOS_DE_CONCLUSAO = [
  // Os textos que já existiam ficam IGUAIS: a etiqueta é o texto, e mudar quebraria
  // o histórico dos relatórios (por isso "Sem interesse" não virou "… / preço").
  "Agendou exame",
  "Remarcou exame",
  "Enviou orçamento",
  "Já tem receita (orçamento)",
  "Fechou venda",
  "Acompanhamento de OS",
  "Retirada de óculos",
  "Garantia / ajuste",
  "Pós-venda resolvido",
  "Sem interesse",
  "Sem resposta do cliente",
  "Fora da área de atendimento",
  "Contato errado ou duplicado",
  "Outro",
] as const;

const PREFIXO = "motivo: ";

export function etiquetaDoMotivo(motivo: string): string {
  return `${PREFIXO}${motivo}`.toLowerCase();
}

/** Tira motivos antigos (reconclusão) e põe o novo, sem mexer nas outras etiquetas. */
export function etiquetasComMotivo(atuais: string[], motivo: string): string[] {
  return [...atuais.filter((e) => !e.startsWith(PREFIXO)), etiquetaDoMotivo(motivo)];
}
