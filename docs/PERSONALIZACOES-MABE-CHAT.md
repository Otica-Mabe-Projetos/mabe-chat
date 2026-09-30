# Mabe Chat — personalizações sobre o DeskcommCRM

O Mabe Chat roda a versão oficial do DeskcommCRM **mais** algumas telas nossas. As
atualizações continuam chegando pelo botão "Atualizar agora" (ver
[ATUALIZACAO-MABE-CHAT.md](ATUALIZACAO-MABE-CHAT.md)). A diferença é que a imagem do
app é montada por nós, a cada versão oficial nova.

## O que é nosso

| Onde | O quê |
|---|---|
| Equipe | **Cadastrar membro**: nome, e-mail, senha e função, e a conta já nasce pronta, sem e-mail de convite, como no VBot. |
| Equipe, menu de cada membro | **Trocar senha**: o admin define uma senha nova. |
| Inbox, topo da lista | **Nova conversa**: pelo telefone (com DDD). Se o número não é contato, vira contato. |
| Funis, ficha do negócio | **Iniciar conversa no Inbox**, quando o negócio tem telefone e ainda não tem conversa. |
| Contatos, ficha do contato | **Iniciar conversa no Inbox**, quando o contato tem telefone e ainda não tem conversa. |
| Inbox (`/app/inbox`), para quem é atendente | **Mesa do atendente**: abas Novos/Meus/Outros, "Iniciar atendimento" antes de responder (espiar não marca como lida), Transferir, Concluir com motivo (etiqueta `motivo: …` + nota interna), origem do anúncio, painel do cliente e "+55 Conversar". Botões "Modo atendente / Modo completo" alternam. Pesquisa e decisões: [PESQUISA-TELA-ATENDIMENTO-2026-09-30.md](PESQUISA-TELA-ATENDIMENTO-2026-09-30.md) |
| Configurações › **Visual Mabe** (só admin) | **Um interruptor** liga tudo da Mabe na hora (salva sozinho). Desligado = o sistema como vem da versão oficial. Ajustes opcionais embaixo: cores, **tom** (dourado/amarelo/preto), **logo da Ótica Mabe** no menu, mesa do atendente, se o atendente pode trocar para o Inbox completo e motivos de conclusão. "Restaurar padrão da Mabe" volta tudo ao de fábrica. |
| Configurações › **Lojas** (só admin) | As lojas (L01–L15, L99, BASE; criar, renomear, desativar), **de qual loja é cada número** (o número passa a se chamar "L15 · Manaus Centro" no sistema inteiro; loja com 2 números ganha o final do telefone) e **quem atende cada loja**, com a **restrição por loja** (liga/desliga). |
| Equipe › menu do membro › **Lojas que atende** | Marca as lojas da pessoa ou "Todas as lojas" (supervisão). Admin sempre vê tudo. |
| **Lojas** (menu Atendimento, gerente e admin) | Painel de supervisão: um cartão por loja com Novos → Em atendimento → Esperando → Concluídos hoje; ao clicar, quem está atendendo, quem espera há mais tempo e os motivos do dia. Atualiza sozinho a cada 30 s. |
| Mesa do atendente | Filtro **Loja**; "Conversar" e "Iniciar conversa" saem pelo número da loja escolhida. |

Regras que valem nessas telas:

- O cadastro e a troca de senha são **só para admin**.
  - Não trocam a senha de conta que já existe.
  - Não trocam a de quem também está em outra empresa, nem a de admin da plataforma.
  - Cada ação fica registrada em Auditoria.
- O vínculo do membro nasce pela mesma função do banco que o convite usa
  (`fn_accept_team_invite`). Convite pendente do mesmo e-mail é fechado.
- "Nova conversa" usa a rota oficial `POST /api/v1/conversations/open-with-contact`.
  - Some para quem só lê.
  - Sem WhatsApp conectado, a tela avisa.

## Como a versão é montada

1. A branch **`personalizacoes`** deste repositório é: uma tag oficial (hoje `v1.64.0`)
   **+** os nossos commits. Todo o código novo mora em arquivos próprios:
   - `components/team/CadastroDireto.tsx`
   - `components/inbox/NovaConversa.tsx`
   - `app/api/v1/team/cadastro-direto`
   - `app/api/v1/team/[user_id]/senha`
   - `hooks/team/useCadastroDireto.ts`
   - `lib/schemas/cadastro-direto.ts`

   - `components/mabe/*` (mesa do atendente, visual e ajustes)
   - `app/app/settings/visual-mabe`

   Nas telas oficiais, só entram poucas linhas marcadas com "Personalização Ótica Mabe".
   Os ajustes do Visual Mabe ficam em `organizations.settings.mabe`, uma chave que
   nenhuma versão oficial lê ou grava: atualizar não apaga nem muda a escolha.
2. O workflow **`.github/workflows/mabe-imagem.yml`** (na `main`) roda a cada 30 minutos:
   1. Pega a última release oficial.
   2. Aplica os nossos commits por cima (cherry-pick).
   3. Monta a imagem, testa se o container sobe e publica
      `ghcr.io/otica-mabe-projetos/mabe-chat-app:<versão>`.
3. O atualizador do servidor só anuncia uma versão quando essa imagem existe. Worker e
   scheduler continuam sendo as imagens oficiais.

Para montar à mão: GitHub › Actions › "Mabe — imagem do app" › Run workflow, com a tag
em branco (última) ou uma tag específica. `forcar` monta de novo uma que já existe.

### Quando uma versão oficial mexe numa tela nossa

O cherry-pick falha, o workflow fica vermelho e **aquela versão não é oferecida**. O
servidor fica na anterior, sem quebrar nada. Para consertar:

```bash
git fetch upstream --tags
git checkout personalizacoes
git rebase --onto vX.Y.Z <tag-base-atual> personalizacoes   # resolver os conflitos
git push --force-with-lease origin personalizacoes
```

Depois é só rodar o workflow de novo.

### Nova personalização

Faça um commit na `personalizacoes` com o código em arquivo próprio, sempre que der.
Conferência local antes do push:

```bash
pnpm install --frozen-lockfile --ignore-scripts
npx tsc --noEmit -p tsconfig.json
npx eslint <arquivos>
```

O teste `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` reprova as frases novas sem
espanhol. É esperado: o teste não roda na montagem, e a tela usa o português.

## Restrição por loja (como funciona e cuidados)

- Com a restrição **ligada**, quem não é admin nem "Todas as lojas" só vê as conversas dos números das
  suas lojas. **Sem loja marcada = não vê nenhuma conversa.** Gerentes também seguem as lojas marcadas.
- A trava mora **no banco** (`supabase/mabe/lojas.sql`, na branch `personalizacoes`): políticas
  RESTRICTIVE nossas em `conversations` (mensagens herdam), `event_log`, `webhook_events_log` e
  `agent_cases`, mais um gatilho que recusa assumir/transferir conversa de outra loja. Não mexe em regra
  oficial; o baseline oficial não a apaga.
- O **atualizador reaplica** esse SQL depois do baseline de cada versão, numa transação só, e confere
  que um admin continua lendo as conversas. Para reaplicar à mão:
  `docker exec infraestrutua_mabe-chat-app-atualizador-1 bash /usr/local/bin/atualizador.sh sql-mabe`.
- Com a restrição ligada, os **Responsáveis por número** (distribuição automática) passam a ser as
  pessoas de cada loja; ao desligar, voltam ao padrão.
- **Fora da trava** (continuam da empresa inteira): Contatos, Funis/negócios, memória da IA sobre o
  contato e Propostas. O mesmo cliente pode falar com duas lojas.
- ⚠️ **Notificações push**: se um dia as chaves `VAPID_*` forem preenchidas, o push oficial manda o
  texto de toda mensagem para todos os aparelhos da empresa, ignorando a loja. Antes de ligar push,
  ajustar `lib/notifications/push.handler.ts` para filtrar por loja.

## Pontos de atenção

- O pacote `mabe-chat-app` no GitHub é **privado**, por decisão do Paulo.
  - O servidor baixa com um token do GitHub **só de leitura** (classic, escopo
    `read:packages`), guardado na aba Ambiente do `mabe-chat-app` como `GHCR_USUARIO` e
    `GHCR_TOKEN`.
  - Se o token vencer ou for revogado, o atualizador para de anunciar versões novas. O
    log diz que a release está "sem as 3 imagens". É só gerar outro e trocar na aba Ambiente.
  - O **código** do fork continua público: o GitHub não deixa um fork virar privado.
- O GitHub desliga o agendamento de um repositório público depois de **60 dias sem
  commit**. Se as versões novas pararem de aparecer, reative o workflow em Actions ou
  rode-o à mão.
- Os workflows oficiais que vieram com o fork (ci, e2e, release, publicar imagem…)
  estão **desligados** neste repositório de propósito.
