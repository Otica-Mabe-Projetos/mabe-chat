# Mabe Chat — trabalho da noite de 01/10/2026

Branch `personalizacoes`, em cima da nossa 1.68.0. Tudo commitado só localmente: **sem push e sem deploy**.
Código novo só em arquivos nossos (`components/mabe/**`, `lib/mabe/**`, `app/app/settings/*-mabe`/`lojas`).
Onde precisou tocar em arquivo oficial, a edição é mínima e tem o comentário "Personalização Ótica Mabe".
Nenhum SQL novo e nenhuma mudança no servidor, no WAHA ou no ERP.

Validação de cada item: `npx vitest run components/mabe`, `npx eslint` e `npm run typecheck` (o pnpm não está
instalado nesta máquina). **Nada foi testado no navegador**: falta um ambiente local com Supabase. A conferência na
tela fica para depois do deploy (lista no fim da seção 1).

## 1. O que foi implementado

| # | O que muda para o atendente/supervisor | Commit | Testes |
|---|---|---|---|
| N1 | Mesa mais rápida. A busca espera 250 ms (digitar "maria" gera 1 consulta, não 5). O relógio saiu do topo da tela, então a conversa não é mais redesenhada a cada 30 s. Painel com esqueleto enquanto a conversa carrega e "Não foi possível abrir a conversa" com o botão "Tentar de novo" quando dá erro (antes aparecia "Escolha um atendimento"). | `5d18ba745` | 18 testes ok (inclui `useAgora` com relógio falso) |
| N2 | Atalhos de teclado na mesa: `j`/`k` navegam, `a` inicia, `r` vai para a resposta, `e` abre o Concluir com motivo (nunca fecha direto), `t` transfere, `1`/`2`/`3` trocam de aba e `?` mostra a ajuda. Os atalhos não disparam enquanto se digita ou com um diálogo aberto. Embaixo do campo aparece a dica "Digite / para respostas rápidas". | `f0f927826` (+ `6a9e1cac8`, conserto de tipos no teste de lojas) | 23 testes ok |
| N3 | Em "Meus", uma faixa mostra "N clientes esperando sua resposta · mais antigo há X", e o clique abre a conversa mais antiga. O badge de "Novos" fica âmbar a partir de 5 min e vermelho a partir de 15 min. Não faz consulta nova. | `91817dddb` | 27 testes ok |
| N4 | Concluir não duplica a nota se for clicado de novo depois de uma falha. A lista padrão de motivos agora tem 14 itens de ótica (Remarcou exame, Já tem receita, Fechou venda, Acompanhamento de OS, Retirada de óculos, Garantia / ajuste, Pós-venda…), e os 8 textos antigos continuam iguais para não quebrar os relatórios. A faixa "Veio do anúncio" já abre aberta quando a conversa está sem dono. | `57dd1026d` | 30 testes ok |
| N5 | Visual premium com contraste AA nos dois temas. O tom "Preto" passa a funcionar (antes caía no verde padrão). A seleção do Dourado e do Amarelo fica clara, e os cinzas ficam legíveis (horário da lista no escuro: de 2,8:1 para mais de 4,5:1). A aba ativa perde a linha dupla, e as configurações quebram linha no celular. | `0c6f8ed50` | 36 testes ok (inclui teste de contraste WCAG) |
| N6 | Em Configurações › Visual Mabe, o botão "Importar respostas rápidas da Mabe" adiciona 10 respostas de ótica (sem preço, prazo, endereço ou horário). Ele só cria as que faltam, então clicar duas vezes não duplica nada nem altera as respostas existentes. Só admin vê o botão. | `991d4ecf7` | 79 testes ok (respostas validadas com o schema oficial) |
| N7 | Menos carga no servidor. As configurações da empresa são lidas 1 vez por página, em vez de 2 a 5. A aba do navegador escondida para de consultar a cada 45 s (antes passava a noite consultando). Abrir uma conversa mantém os filtros de loja e de atendente. | `952cb1d5f` | 63 testes ok (inclui testes oficiais de tempo real) |
| N8 | Tela de Lojas mais segura. Ligar ou desligar a trava pede confirmação com resumo. O quadro "Situação" mostra pessoas sem loja, números sem loja e lojas sem ninguém marcado. O texto agora diz que Contatos, Funis, Agenda e Tarefas continuam visíveis para todos. "Salvo, mas…" aparece como aviso, não como erro. Se a leitura da equipe falhar, nada é gravado (antes podia zerar os responsáveis). | `43dae060c` | 44 testes ok |
| Revisão | Quem tem "todas as lojas" deixou de esconder "loja sem atendente", porque essa pessoa não entra no rodízio. Antes, uma loja sem ninguém aparecia como "Tudo marcado". | `684be4cfd` | 8 testes de lojas ok |
| N9 | **Parcial, NÃO commitado.** Papéis em português na Equipe ("Papel", "Gerente", "Somente leitura"…), confirmação ao entrar em admin ou sair dele, e cadastro direto já com loja. | — | Só `lib/mabe/papeis.test.ts` ok; typecheck/lint não terminaram |

**N9: como terminar.** Os arquivos estão no worktree. Modificados: `app/app/settings/lojas/_client.tsx`,
`app/app/team/_components/TeamMembersClient.tsx` (oficial, edição marcada) e `components/team/CadastroDireto.tsx`.
Novos: `components/mabe/equipe/ConfirmarPapel.tsx`, `lib/mabe/papeis.ts` e `lib/mabe/papeis.test.ts`.
Rodar `npm run typecheck`, `npx vitest run components/mabe lib/mabe tests/unit` e `npx eslint` nesses arquivos.
Se tudo passar, commitar só esses 6 com `feat(mabe): papéis em português e cadastro com loja`.
Atenção: o seletor de papel tem 130 px e "Somente leitura" pode ficar apertado.

**Conferir na tela depois do deploy:**
- `j`/`k` mudam o `?id=`;
- `e` abre o Concluir com motivo;
- os atalhos param enquanto se digita;
- a faixa de espera em "Meus";
- o tom Preto e a seleção nos dois temas;
- Importar respostas duas vezes;
- a confirmação da trava;
- no log do Kong, nenhuma consulta com a aba escondida.

**Dívidas conhecidas, que já existiam antes desta noite:**
- o teste `i18n-espanhol-cobre-a-tela` reprova: ~153 textos de `components/mabe` estão sem espanhol, e o lugar para colocá-los, `lib/i18n/dicionario.ts`, é arquivo oficial;
- o teste `tailwind-tokens` acusa `rounded` puro no esqueleto do `Atendimento.tsx` (trocar por `rounded-md`).

## 2. O que ficou para depois e quem decide

Ordem sugerida: os itens 1 a 3 (servidor) **antes do próximo deploy**.

1. **WAHA perde mensagem de cliente em todo deploy** (Paulo). Em 30/09, o reenvio do webhook chegou a 13 de 15
   tentativas enquanto o app reiniciava (~30 s de janela). Quando as tentativas acabam, a mensagem some sem rastro.
   Para corrigir, no EasyPanel › infraestrutua › mabe-chat-app › serviço `waha` › Ambiente:
   `WHATSAPP_HOOK_RETRIES_POLICY=exponential`, `WHATSAPP_HOOK_RETRIES_DELAY_SECONDS=2` e
   `WHATSAPP_HOOK_RETRIES_ATTEMPTS=9` (~17 min de cobertura). É seguro: a ingestão já ignora duplicatas
   (`lib/waha/ingest.ts`). Para conferir, no deploy seguinte as tentativas devem aparecer espaçadas e terminar em 200.
2. **Sem backup do WhatsApp nem do banco do Mabe Chat** (Paulo). O volume `waha-data` (sessões dos 4 números) e o
   Postgres da infraestrutua não estão no crontab. Perder esse volume = parear de novo cada número com o celular da loja.
   Para corrigir, criar um script diário em `/root/backups/`, no padrão dos que já existem: tar.gz do `waha-data` +
   `pg_dump`, com rotação de 7 dias. É pré-requisito para atualizar o WAHA.
3. **Assinatura do webhook com o nome de variável errado** (Paulo). O container usa `WHATSAPP_HOOK_HMAC`, mas a doc
   do WAHA pede `WHATSAPP_HOOK_HMAC_KEY`. Passos:
   - (a) conferir, sem imprimir os valores, que o segredo do app e o do WAHA são iguais (comparar o hash);
   - (b) criar `WHATSAPP_HOOK_HMAC_KEY` no `waha` e reiniciar só esse serviço;
   - (c) ver `valid_signature=true` em `webhook_events_log`;
   - (d) só então ligar `WAHA_WEBHOOK_REQUIRE_SIGNATURE`.

   Fora de ordem, o app recusa tudo com 401. O comentário em `lib/waha/webhook-auth.ts` deve ser corrigido via upstream.
4. **WAHA: memória, healthcheck, log e versão** (Paulo):
   - limite de memória de 1,25 GiB → 2 GiB (hoje usa ~800 MiB);
   - healthcheck `GET /ping`;
   - `WAHA_HTTP_LOG_LEVEL=warn` (hoje o log guarda só ~39 h);
   - depois do backup, testar a 2026.9 NOWEB num container paralelo e só então trocar a imagem (está em 2026.7.2);
   - investigar o loop de start de sessão recusada (30/09, 17:33–17:38) antes de mexer no watchdog.
5. **Transcrição de áudio parada** (Paulo, custo). A empresa não tem chave de IA, então o worker registra
   `media-derive failed permanently`. Para resolver, cadastrar a chave em IA › credenciais. Sem isso, o áudio do
   cliente não vira texto nem entra na busca.
6. **Tempo real gera recargas demais** (Paulo/upstream). No pico, 5 webhooks geraram 127 recargas da lista e 406
   validações de login em 1 minuto. Em 24 h foram 12.968 validações de login contra 4.532 consultas úteis. Correção,
   via PR upstream (`deskcomm-contribuir`) com teste, porque mexe no núcleo:
   - debounce de ~400 ms em `hooks/inbox/useConversationsRealtime.ts` e `useMessagesRealtime.ts`;
   - invalidar a lista só em INSERT;
   - nas rotas `conversations`, `counts` e `messages`, trocar o `getUser()` duplicado por `loadAuthUser()`.

   É o maior ganho de velocidade disponível.
7. **Índices para a Fila e a busca de contato** (Paulo, precisa de janela). Criar `supabase/mabe/indices.sql`
   idempotente com:
   - índice em `conversations(organization_id, comando_da_conversa, awaiting_since, id)`;
   - índice trigram em `contacts(display_name)` e `contacts(phone_number)`.

   Criar fora do horário de pico (o atualizador não usa CONCURRENTLY), **antes de importar a base do ERP**, e validar
   com `EXPLAIN ANALYZE`.
8. **`lojas.sql` frágil** (Paulo, release revisado):
   - nas linhas 54 e 56, `::boolean` dá erro com um valor malformado e derrubaria a leitura de todas as conversas.
     Trocar por `coalesce(o.settings #> '{mabe_lojas,trava}' = 'true'::jsonb, false)`, e o mesmo para `todas`;
   - trocar a mensagem crua "conversa de outra loja" por "Esta conversa é de uma loja que você não atende.";
   - simplificar as políticas de `event_log` e `agent_cases`.
9. **Brechas da trava por loja** (Paulo, muda regra em produção):
   - (1) transferir para alguém que não atende a loja faz a conversa sumir para os dois. Correção: o gatilho
     `mabe_trava_atribuicao` passa a conferir o destino, com uma função `mabe.fn_usuario_ve_numero`;
   - (2) com a trava ligada, um número sem loja continua no rodízio de quem não o vê. Correção: aplicar roteamento
     vazio nesses números em `sincronizarResponsaveis`;
   - (3) um gerente de uma loja só consegue mudar a distribuição de outras lojas;
   - decidir também se quem tem "todas" deve receber leads: hoje só supervisiona.
10. **Contatos, CRM e Agenda não são travados por loja** (Paulo, decisão de produto). Hoje a atendente da L01 vê
    contatos e agenda de todas as lojas.
    - Paliativo imediato, sem código: Interface Simplificada para atendentes, que também elimina o "Erro ao carregar
      membros." em Equipe e Campanhas.
    - Isolamento de verdade: política RESTRICTIVE nossa em `contacts`/`crm_leads`, com teste de desempenho.
11. **Base do ERP: cartão "Cliente da ótica" na mesa** (Paulo + André). Desenho:
    - uma rota nossa recebe o id da conversa e lê a conversa com a sessão (assim a trava vale);
    - com o telefone (`canonicalPhoneBR`), chama pelo módulo oficial `lib/external-db` (transação só-leitura) uma
      função do ERP que devolve só: é cliente, última compra (data e loja), quantidade de compras e OS em andamento.
      Sem CPF e sem valores.

    Regras:
    - o usuário do ERP fica **sem SELECT em tabela**, só com EXECUTE na função. O explorador oficial de "Dados
      externos" abre tudo para qualquer membro a partir de viewer;
    - **não** gravar em `contacts.first_service_at` nem na etiqueta "cliente": são do sistema, ligadas à agenda.

    Pendências do André:
    - criar a role e a função;
    - fazer o de-para das lojas do ERP para L01..L15;
    - dizer onde ficam as OS (talvez no sistema-de-Mabe).

    O ERP hoje só tem Manaus, com um buraco de jan a jul/2026. Próximo passo nosso: escrever
    `docs/mabe/ERP-CLIENTE-NO-MABE-CHAT.md` com o rascunho do SQL para o André (sem credenciais).
12. **Agenda em dois lugares** (Paulo). Os TMKs agendam no RD CRM, mas é a agenda do Mabe Chat que marca "cliente".
    Proposta:
    - piloto numa loja usando só a agenda do Mabe Chat (botão "Agendar exame" em destaque);
    - se aprovado, enviar do Mabe Chat para o RD pelos webhooks de saída oficiais.
13. **Ordem "quem espera há mais tempo" em Novos** (Paulo). O padrão hoje é "recentes", a pedido dele. Já é
    configurável em Visual Mabe, e o N3 já deixa o atraso visível.
14. **Endereço e horário da loja nas respostas rápidas** (Paulo). Exige:
    - endereço, horário e mapa no cadastro da loja;
    - 1 linha marcada em `Composer.tsx`, ou PR upstream para `template-vars`.

    Para o Pará, usar a mensagem padrão dos TMKs do funil EQUIPE PARÁ.
15. **Dourado e bordas** (Paulo, gosto). Hoje o botão sai `#675023`. A proposta é `#7a5d1f` (hover `#654c18`), com
    bordas `#dcd7cb` no claro e `#3a382f` no escuro. Ver na tela antes de fixar em `cor.ts`.
16. **Código nosso em pastas oficiais** (sessão supervisionada). `NovaConversa`, `CadastroDireto`,
    `useCadastroDireto`, `cadastro-direto` e as rotas de senha e cadastro devem ir para `components/mabe` e
    `lib/mabe`, com reexport de 1 linha. Tirar "Lojas" da barra lateral elimina a edição no teste oficial
    `interface-por-empresa` (15→16).
    Pendências miúdas:
    - gravação atômica de settings;
    - N+1 em `settings/lojas/page.tsx`;
    - painel `/app/lojas` sem join de contatos;
    - validação de uuid na rota de senha.
17. **Recuperar mensagens após queda e usar o número oficial** (Paulo). A recuperação exige ligar o `noweb.store`
    (reinicia a sessão). O adaptador da Cloud API já existe (`lib/channels/adapters/meta-cloud.ts`). Caminho:
    número oficial para anúncios e disparos, WAHA para as lojas e os TMKs.
18. **Ponteiro neste doc**: `docs/PERSONALIZACOES-MABE-CHAT.md` só existe na branch `main` (checkout `mabe-chat`),
    não em `personalizacoes`. Não foi criado aqui para evitar conflito de arquivo adicionado nos dois lados. Falta
    acrescentar lá a linha que aponta para este arquivo.

## 3. Pesquisas por frente

Fontes externas no fim de cada item. As fontes internas foram arquivos do repositório e, no servidor, apenas leitura
(`docker ps/stats/logs/inspect`, sem imprimir segredos e sem deixar arquivo).

- **Atendimento de ótica.** A mesa já cobre o essencial do VBot. Faltavam:
  - atalhos, feitos no N2;
  - espera visível em "Meus", feita no N3;
  - motivos de ótica, feitos no N4;
  - pacote de respostas, feito no N6;
  - variáveis de loja e ordem por espera, que ficaram para depois.

  Speed-to-lead: responder em até 5 min qualifica muito mais. O Chatwoot usa `/` para respostas prontas e SLA visível.
  Sistemas de ótica fazem aviso de óculos pronto e recall de exame em ~12 meses.
  Fontes: chatwoot.com/features/canned-responses, chatwoot.com/features, kommo.com/blog/click-to-whatsapp,
  ventas-boost.com/en/widgets/sla-first-touch, asisteclick.com (CTWA 2026), developer.zendesk.com (conversation
  referrals), zfsystem.com.br/recursos, socialhub.pro (WhatsApp para ótica).
- **Visual premium.** O mod Visual Mabe é bem isolado (`<style id="visual-mabe">` depois da marca oficial). Problemas
  medidos:
  - o Preto caía no verde;
  - o Dourado escurecia até marrom-oliva;
  - a seleção era saturada demais, com o cinza reprovando no AA;
  - o cinza fraco do escuro dava 2,8:1;
  - o painel mostrava a mensagem errada ao carregar.

  Tudo corrigido no N5/N1 sem tocar em arquivo oficial. A Atkinson Hyperlegible fica.
  Fontes: linear.app/now/how-we-redesigned-the-linear-ui, w3.org/WAI/WCAG22/Understanding/non-text-contrast.html,
  webaim.org/articles/contrast.
- **Desempenho.** O servidor está folgado (app com 242 de 768 MiB, banco com 1,4% de CPU). A lentidão vem do volume
  de requisições:
  - login validado ~2,7 vezes por requisição;
  - o tempo real recarrega a lista inteira a cada evento;
  - abas escondidas consultam a noite toda;
  - a busca da mesa não tinha debounce;
  - a Fila e a busca de contato não têm índice.

  A parte nossa entrou no N1/N7. A parte do núcleo e dos índices está nos itens 6 e 7 da seção 2.
  Não medidos: EXPLAIN das consultas, latência do GoTrue e tamanho do pacote.
- **WhatsApp/WAHA.** A base é sólida: webhook síncrono com 503 + reenvio, replay por cron, watchdog e ingestão de
  40–90 ms. Os problemas estão na configuração do servidor:
  - reenvio curto demais no deploy;
  - HMAC com o nome errado;
  - sem backup;
  - log curto;
  - versão atrasada;
  - check-exists sem cache (~200 ms por envio e sinal de risco de ban).

  Recomendação: modelo híbrido, com WAHA para as lojas e Cloud API para o número oficial.
  Fontes: waha.devlike.pro/docs/how-to/config, waha.devlike.pro/docs/how-to/events,
  waha.devlike.pro/docs/overview/changelog, github.com/devlikeapro/waha.
- **Acesso e configurações.** A trava por loja vale de verdade em conversas, métricas, tempo real e painel. Brechas:
  - transferência para quem não vê a loja;
  - número sem loja no rodízio;
  - Contatos/CRM/Agenda abertos;
  - gerente de uma loja mexendo em outras;
  - "Dados externos" aberto a viewer.

  Problemas de uso:
  - papéis em inglês;
  - trava sem confirmação;
  - membro novo sem loja;
  - erros crus.

  N8, N9 e a revisão resolvem a parte de tela. O resto está nos itens 8 a 11 da seção 2.
- **Código.** Organizado. Pontos tratados nesta noite: debounce, relógio no topo, settings lidos várias vezes, filtros
  perdidos ao abrir conversa, nota duplicada, erros ignorados nas sincronizações e mapa de papéis repetido.
  Ficaram para depois:
  - `::boolean` no SQL;
  - gravação de settings sem trava;
  - código nosso em pastas oficiais;
  - validação duplicada;
  - teste de paridade entre TS e SQL.
- **ERP/CRM.** O "cliente" oficial vem da agenda e é protegido por gatilho. Para o ERP, o caminho é o módulo oficial
  "Integração de dados" (senha cifrada, só-leitura, auditoria), consultado sob demanda pela conversa e sem copiar a
  base (minimização LGPD). A integração com o RD só recebe webhook do RD Marketing e não tem ligação com o RD CRM.
  Decisões no item 11 da seção 2.
