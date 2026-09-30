# Pesquisa: tela de atendimento (mesa do atendente) — 30/09/2026

**Objetivo.** Desenhar a tela de atendimento do Mabe Chat para TMKs e vendedores de loja.
- **Ponto de partida:** o VBot, que a equipe usa hoje.
- **Evidência:** as melhores plataformas de atendimento do Brasil e do mundo.
- **Identidade:** a da Ótica Mabe.

As decisões de produto estão em `PRODUCT.md` e o contrato de desenho em
`.impeccable/surfaces/app-app-inbox-page-tsx.md`, ambos na branch `personalizacoes`. O
que foi construído está em [PERSONALIZACOES-MABE-CHAT.md](PERSONALIZACOES-MABE-CHAT.md).

**Método.** Foram quatro frentes em paralelo:
1. plataformas brasileiras e da América Latina;
2. referências mundiais;
3. WhatsApp, anúncios e ergonomia;
4. peças que o Mabe Chat já tem.

Toda afirmação sobre outra plataforma tem link. O que não foi possível verificar está marcado
"n/v". Os prints do VBot têm dados de clientes e **não** entram aqui, porque o repositório é
público.

## 1. O que o VBot faz (e a equipe já sabe usar)

Ele é white-label da família WTS. As docs públicas dessa família (helenaCRM/flw.chat) descrevem
a mesma tela.

- **Abas Novos (com contador) / Meus / Outros**, com filtros Todas / Não lidas
  ([docs](https://docs.helena.app/configurando-sua-plataforma/atendimento/abas-e-filtros-de-conversas)).
- **"Iniciar"** move de Novos para Meus. Antes disso o cliente não recebe o "lida"
  ([docs](https://docs.helena.app/configurando-sua-plataforma/atendimento/assumir-atendimento)).
- **Concluir ▾** (classificar com motivo) e **Transferir** para equipe ou colega
  ([concluir](https://docs.helena.app/configurando-sua-plataforma/atendimento/concluir-atendimento),
  [transferir](https://docs.helena.app/configurando-sua-plataforma/atendimento/transferir-atendimento)).
- **Cartão do anúncio e "Rastreamento"** (origem, campanha, headline) dentro da conversa.
  Nenhuma das plataformas brasileiras pesquisadas tem equivalente nativo, então é um
  diferencial a manter.
- "+55 · Conversar" embaixo da lista e "Atendimento expira em" (este não foi pedido).

## 2. Brasil / LatAm: o que se repete (3+ plataformas)

| Padrão | Onde |
|---|---|
| Lista \| conversa \| painel recolhível | [Chatwoot](https://www.chatwoot.com/hc/user-guide/articles/1677231493-lesson-2-dashboard-basics), [Octadesk](https://help.octadesk.com/a/como-funciona-o-painel-de-conversas-chat), [Digisac](https://digisac.gitbook.io/manual-digisac-2-0/novo-chat-de-atendimento/nova-experiencia-no-chat-de-atendimento), [Blip](https://help.blip.ai/hc/en-us/articles/22703102800023-Sidebar-Menus-and-Quick-Filters) |
| Três visões por posse (minhas / fila / todas ou outros) | WTS, [Digisac](https://digisac.gitbook.io/manual-digisac-2-0/novo-chat-de-atendimento/aba-fila), Chatwoot, [RD Conversas](https://ajuda.rdstation.com/s/article/Como-utilizar-a-funcionalidade-Chat-do-RD-Station-Conversas?language=pt_BR), Octadesk, [Zenvia](https://support.zenvia.com/kb/pt-br/article/483168/caixa-de-atendimento-de-suporte-zcc), [Umbler](https://help.umbler.com/hc/pt-br/articles/9778179733901-Como-funciona-o-chat-do-Talk) |
| Assumir com ação explícita, podendo ver antes | WTS, [Huggy](https://help.huggy.io/inbox/um-guia-de-transicao-novo-inbox), [RD Conversas](https://ajuda.rdstation.com/s/article/Realizar-encaminhar-transferir-atendimentos?language=pt_BR), Octadesk |
| Encerrar com tabulação/motivo (às vezes obrigatória) | WTS, [Huggy](https://help.huggy.io/inbox/como-utilizar-tabulacoes), RD, [Digisac](https://digisac.gitbook.io/manual-digisac-2-0/chat-de-atendimento/area-do-atendimento/encerrar-chamados), Zenvia |
| Cor de alerta para espera (amarelo/vermelho) | [Blip](https://help.blip.ai/hc/en-us/articles/31612107300503-SLA-Rules), [Zenvia](https://support.zenvia.com/kb/pt-br/article/346719/sla-de-primeira-resposta), [Octadesk](https://help.octadesk.com/a/como-configuro-limite-tempo-de-atendimento-chat/), Digisac |
| Respostas rápidas com "/" | [WTS](https://docs.helena.app/configurando-sua-plataforma/atendimento/tipos-de-mensagens/enviar-mensagem-rapida), [Huggy](https://help.huggy.io/inbox/crie-atalhos-na-huggy), Chatwoot |

Ideias boas a considerar:
- espiar sem marcar "lida" (Huggy, WTS);
- fila em ordem de chegada estável (Digisac);
- densidade compacta ou expandida (Chatwoot);
- filtro "Não respondidas" / "Unattended" (Octadesk, Chatwoot);
- motivo de conclusão com valor de venda (WTS).

## 3. Referências mundiais: princípios que se repetem

1. **Três zonas com laterais recolhíveis**:
   [Zendesk](https://support.zendesk.com/hc/en-us/articles/4408836526362-Using-the-context-panel-in-the-Zendesk-Agent-Workspace),
   [Front](https://help.front.com/en/articles/3889728),
   [Intercom](https://www.intercom.com/blog/announcing-intercoms-next-gen-inbox/),
   [respond.io](https://respond.io/help/inbox/inbox-overview).
2. **Tempo de espera do cliente é o sinal nº 1 da fila.**
   - O padrão do [Help Scout](https://docs.helpscout.com/article/919-about-waiting-since) é o tempo de espera.
   - Ordenação por espera no [Intercom](https://developers.intercom.com/docs/references/1.2/rest-api/conversations/list-conversations) e no [Front](https://help.front.com/en/articles/2144).
   - Cores do SLA no [Zendesk](https://support.zendesk.com/hc/en-us/articles/4408832852122-Viewing-and-understanding-SLA-targets): verde acima de 15 min, âmbar abaixo de 15 min, vermelho quando vencido.
3. **Assumir em 1 clique e com resposta instantânea**: abaixo de 0,1 s parece instantâneo
   ([NN/g](https://www.nngroup.com/articles/response-times-3-important-limits/)).
4. **Fechar com motivo obrigatório e ir para a próxima**:
   [Intercom](https://www.intercom.com/changes/en/2156-categorize-conversations-consistently-with-required-conversation-data-attributes-and-more),
   [Zendesk](https://support.zendesk.com/hc/en-us/articles/4408888756762),
   [respond.io](https://respond.io/help/workspace-settings/closing-notes),
   [Help Scout](https://docs.helpscout.com/article/228-redirect-options).
5. **Cor só para status, e nunca sozinha**:
   - contraste 4,5:1 para texto e 3:1 para ícones ([Zendesk Garden](https://garden.zendesk.com/design/color));
   - cor nunca é o único meio de informar ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)).
6. **Divulgação progressiva no painel lateral**: no máximo 2 colunas e cerca de 5 linhas por
   bloco ([Zendesk](https://developer.zendesk.com/documentation/apps/app-design-guidelines/support/sidebar-apps-support/),
   [NN/g](https://www.nngroup.com/articles/complex-application-design/)).
7. **Origem do anúncio na conversa**: evento "Click-to-Chat Ad" na timeline do
   [respond.io](https://respond.canny.io/changelog/new-click-to-chat-ads-workflow-trigger-and-improved-channel-events).

Dado de negócio (não é de UI): lead contatado em até 1 h tem cerca de 7 vezes mais chance de
qualificar que 1 h depois ([HBR, 2011](https://hbr.org/2011/03/the-short-life-of-online-sales-leads)).

## 4. WhatsApp, anúncio e ergonomia

- **Modelo mental WhatsApp:**
  - filtros Todas / Não lidas ([FAQ](https://faq.whatsapp.com/1470216183498937));
  - respostas rápidas com "/", que preenchem sem enviar ([FAQ](https://faq.whatsapp.com/1791149784551042));
  - tiques ✓✓ ([FAQ](https://faq.whatsapp.com/665923838265756)).
- **Dado do anúncio:**
  - Na Cloud API é o `referral` (headline, body, source_url, ctwa_clid)
    ([Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/text)).
  - No WhatsApp por QR vem em `contextInfo.externalAdReply`, que o produto já grava no
    contato ([DeskcommCRM #1505](https://github.com/melgarafael/DeskcommCRM/pull/1505)).
  - Risco conhecido: no NOWEB, a 1ª mensagem de contato vindo de anúncio às vezes não é emitida
    ([WAHA #2267](https://github.com/devlikeapro/waha/issues/2267)).
- **Claro por padrão, escuro opcional**: o claro rende mais para quem tem visão normal
  ([NN/g](https://www.nngroup.com/articles/dark-mode/)).
- **Alvos de toque e clique** de pelo menos 24×24 px
  ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- **Status com ícone, texto e cor**
  ([Carbon](https://carbondesignsystem.com/patterns/status-indicator-pattern/)).
- **Notificações:**
  - uma por conversa, sem piscar mais de 5 s
    ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification),
    [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html));
  - o som só toca depois de um clique do usuário
    ([Chrome](https://developer.chrome.com/blog/autoplay)).

## 5. Como ficou no Mabe Chat (1ª leva, 30/09/2026)

| Decisão | Por quê (fonte) |
|---|---|
| Mesa própria em `/app/inbox` para quem é atendente, com alternância "Modo atendente / Modo completo" | VBot + princípio 6: o atendente não tropeça em gestão nem em IA. A doutrina oficial proíbe esconder ação no cabeçalho do Inbox completo |
| Abas **Novos / Meus / Outros**, com contagem em Novos e Meus | VBot + padrão brasileiro de três visões por posse |
| Novos em ordem de espera, com "Aguardando há…" e posição na fila | Princípio 2 (Help Scout, Intercom, Front). É a ordem oficial da fila |
| **"Iniciar atendimento"** em dourado antes de responder. Espiar não marca como lida | VBot/WTS, Huggy |
| **Concluir com motivo**: etiqueta `motivo: …`, nota interna e fechamento | Princípio 4 e padrão brasileiro de tabulação. **A lista de motivos é provisória** |
| **Transferir** para colega ou para outro número | Padrão brasileiro. Não existe entidade de unidade no produto |
| Faixa "Veio do anúncio" no topo da conversa e cartão "De onde veio" no painel. Sem anúncio, aparece "Origem não capturada" | Diferencial do VBot + respond.io + seção 4 |
| Chip de espera: neutro, âmbar a partir de 5 min, vermelho a partir de 15 min, sempre com ícone e texto | Zendesk, WCAG 1.4.1, Carbon. Limiares escolhidos para lead de anúncio |
| Painel do cliente enxuto: contato, origem, etiquetas, Agendar e Ficha completa | Princípio 6 |
| **"+55 · Conversar"** fixo embaixo da lista | VBot |
| Dourado Mabe `#a8802e` como acento, pela marca oficial. O acento aparece só na ação primária, na seleção e em Novos | Paleta da Mabe (`PRODUCT.md`). Operate = acento contido. Os neutros do app já são os quentes da Mabe |

## 6. Plano de ação (próximas levas)

1. **Validar com a equipe (agora).**
   - Paulo e 1 ou 2 TMKs usam a mesa por um dia.
   - Os prints voltam para a revisão final de desenho.
   - Ajustes em lote.
2. **Motivos oficiais de conclusão.** A operação define a lista, e ela troca a provisória. Opção:
   um valor de venda, como no WTS, para o vendedor de loja.
3. **Agendar sem sair da conversa.**
   - Decidir onde o agendamento é gravado: Agenda do Mabe Chat, agenda das LPs (unidade, data,
     vagas) ou RD Station.
   - Depois, um painel de marcação ao lado da conversa, com as datas e unidades reais.
4. **Produtividade.**
   - Atalhos de teclado da mesa: próximo, iniciar, concluir.
   - Setas no menu "/" (hoje só funciona com o mouse).
   - Filtro "Sem resposta".
   - Densidade compacta como opção.
5. **Notificação por conversa** (som e título da aba), sem rajada e com configuração visível.
6. **Origem do anúncio na 1ª mensagem** e filtro por campanha na lista.
7. **Tela do vendedor de loja**, se a operação pedir: carteira por loja e pós-venda.
