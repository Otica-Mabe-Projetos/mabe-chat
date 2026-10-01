/**
 * Pacote de respostas rápidas de ótica da Mabe (personalização Ótica Mabe).
 *
 * Viram templates compartilhados da org pela API oficial (/api/v1/message-templates);
 * no composer, "/" abre o menu e busca por título ou atalho. Só usam {{nome}} e
 * {{primeiro_nome}} — o composer não interpola outra variável (ficaria literal).
 * Sem preço, prazo, gratuidade, endereço ou horário: isso depende de cada loja.
 */
export type RespostaDaMabe = { title: string; shortcut: string; body: string };

export const RESPOSTAS_DA_MABE: RespostaDaMabe[] = [
  {
    title: "Saudação",
    shortcut: "ola",
    body: "Olá, {{primeiro_nome}}! Aqui é da Ótica Mabe. Como posso te ajudar hoje?",
  },
  {
    title: "Agendar exame de vista",
    shortcut: "agendar",
    body: "{{primeiro_nome}}, que tal já deixarmos seu exame de vista agendado? Qual o melhor dia para você e prefere manhã ou tarde?",
  },
  {
    title: "Confirmar agendamento",
    shortcut: "confirmar",
    body: "Oi, {{primeiro_nome}}! Passando para confirmar seu atendimento amanhã na Ótica Mabe. Pode confirmar respondendo SIM?",
  },
  {
    title: "Remarcar (faltou)",
    shortcut: "remarcar",
    body: "Oi, {{primeiro_nome}}! Sentimos sua falta no atendimento. Quer marcar um novo horário? Me diga o melhor dia e período para você.",
  },
  {
    title: "Pedir receita",
    shortcut: "receita",
    body: "{{primeiro_nome}}, para preparar seu orçamento, pode me enviar uma foto nítida da sua receita, com todos os números bem visíveis?",
  },
  {
    title: "Enviar orçamento",
    shortcut: "orcamento",
    body: "{{primeiro_nome}}, segue o seu orçamento. Qualquer dúvida sobre lentes ou armações, estou à disposição para te ajudar.",
  },
  {
    title: "Óculos prontos",
    shortcut: "oculospronto",
    body: "Boa notícia, {{primeiro_nome}}! Seus óculos estão prontos para retirada na loja. Estamos te esperando!",
  },
  {
    title: "Andamento do pedido",
    shortcut: "os",
    body: "{{primeiro_nome}}, vou verificar o andamento do seu pedido com o laboratório e já te retorno.",
  },
  {
    title: "Pós-venda",
    shortcut: "posvenda",
    body: "Oi, {{primeiro_nome}}! Como está a adaptação com os seus óculos novos? Se precisar de algum ajuste, é só me chamar.",
  },
  {
    title: "Retomar conversa",
    shortcut: "retorno",
    body: "Oi, {{primeiro_nome}}, ainda posso te ajudar?",
  },
];

/** As respostas do pacote que ainda não existem (mesmo atalho, sem caixa, ou mesmo título). */
export function quaisFaltam(existentes: { shortcut: string | null; title: string }[]): RespostaDaMabe[] {
  const atalhos = new Set(existentes.map((e) => e.shortcut?.trim().toLowerCase()).filter(Boolean));
  const titulos = new Set(existentes.map((e) => e.title.trim().toLowerCase()));
  return RESPOSTAS_DA_MABE.filter(
    (r) => !atalhos.has(r.shortcut.toLowerCase()) && !titulos.has(r.title.toLowerCase()),
  );
}
