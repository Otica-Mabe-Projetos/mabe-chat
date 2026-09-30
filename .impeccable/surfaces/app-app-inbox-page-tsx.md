---
version: 1
slug: "app-app-inbox-page-tsx"
primary_target: "app/app/inbox/page.tsx"
related_targets: ["components/mabe/atendimento"]
---

## Scope

`/app/inbox` em **Modo atendente**: padrão para quem é `agent`, com alternância para qualquer papel. Modo Operate. O Inbox completo continua intacto.

## Audience and job

- TMKs e vendedores de loja.
- Tarefas:
  1. responder rápido quem chegou;
  2. assumir antes de responder;
  3. transferir entre colegas ou números;
  4. concluir com motivo;
  5. ver de qual anúncio o lead veio.
- Agendar dentro da conversa é da fase seguinte, porque ainda não está decidido onde o agendamento é gravado.

## Direction contract

- **THESIS:** a mesa do atendente é uma fila para esvaziar, não um CRM para explorar. Quem espera há mais tempo está sempre a um olhar e um clique. IA, gestão e profundidade de CRM saem do caminho. A tela recusa o padrão da categoria, o inbox "tudo ao mesmo tempo" com seis botões no topo e painéis de IA.
- **OWN-WORLD:**
  - Cor: dourado Mabe como acento, pela rampa da marca oficial (`#a8802e`), sobre neutros claros quentes da Mabe e texto quase preto.
  - O dourado aparece só em três lugares: a ação primária, a barra de seleção e o selo de Novos.
  - Espera em chip semântico com ícone e texto: neutro, âmbar a partir de 5 min, vermelho a partir de 15 min.
  - Tipografia: Atkinson Hyperlegible, a fonte do app.
  - Balões fiéis ao WhatsApp.
- **STORY:** a atendente abre Novos e vê quem espera há mais tempo. Espia sem marcar como lida e clica em "Iniciar atendimento". Responde com "/", vê o anúncio que trouxe o lead, e transfere ou conclui com motivo. Meus mostra o trabalho dela. Outros mostra o dos colegas.
- **FIRST VIEWPORT:** 3 colunas a partir de 1280 px.
  - **Esquerda, ~340 px:**
    - abas Novos/Meus/Outros com contagem;
    - Todas/Não lidas e busca;
    - linhas da lista;
    - fixo embaixo: "+55 telefone · Conversar".
  - **Centro:**
    - cabeçalho enxuto: avatar, nome, telefone, número de atendimento e chip de status;
    - cartão de origem do anúncio no topo da conversa;
    - conversa;
    - base antes de assumir: faixa "Iniciar atendimento" em dourado + Transferir;
    - base depois de assumir: compositor + linha Transferir · Lembrar · Concluir.
  - **Direita, ~320 px:** Contato, Origem do anúncio, Etiquetas e atalhos (ficha completa, agendar, funil).
- **FORM:** fixado pelo pedido. É a mesa em 3 colunas do VBot, a ferramenta atual da equipe, refinada pelo consenso da pesquisa: 3 zonas, fila por tempo de espera, assumir explícito e concluir com motivo. Sem concept-seed, porque o pedido já veio especificado.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- **Onde o agendamento é gravado:** na Agenda do Mabe Chat, no sistema das LPs ou no RD.
- **Lista final de motivos de conclusão.** Os que estão no código são provisórios.
- **Tela separada para vendedor de loja,** ainda não decidido.
