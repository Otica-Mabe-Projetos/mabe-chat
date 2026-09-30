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
| Configurações › **Visual Mabe** (só admin) | O "mod" da Mabe num lugar só: **Cores da Mabe** (dourado; desligado = visual original), **Mesa do atendente** (desligada = Inbox completo para todos), **Atendente pode trocar para o Inbox completo** e **Motivos de conclusão** (um por linha). "Restaurar padrão da Mabe" volta tudo ao de fábrica. |

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
