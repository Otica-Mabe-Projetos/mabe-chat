# Mabe Chat — plano por fases (29/09/2026)

**Objetivo:** tirar o atendimento de WhatsApp da Ótica Mabe de ferramentas frágeis e
desconectadas (VBot e chips que caem) e levá-lo para um sistema próprio. Nesse sistema:

- o lead da LP chega sozinho;
- a IA ajuda sem inventar data;
- lembrete, confirmação e remarcação saem automáticos;
- o comparecimento volta para o RD Station e para o OSA.

**Escopo no servidor:** só o projeto EasyPanel `infraestrutua` (`mabe-chat-app`,
`mabe-chat-supabase` e serviços novos criados ali). `connecting2` e `ia-automacoes` não
são tocados.

## Diagnóstico que manda no plano

Base: investigação de 29/09.

| Achado | Consequência |
|---|---|
| O env do app no EasyPanel **é o `.env.example`**. O EasyPanel copia o template sozinho quando a fonte git é configurada. | O app dá 500, e worker, scheduler e WAHA ficam em loop. Editar o `.env` no disco não resolve, porque todo "Implantar" regrava o arquivo a partir do env armazenado. |
| `ANON_KEY`/`SERVICE_ROLE_KEY` do Supabase foram salvas **mascaradas**: 8 caracteres e depois "••••". | Nenhuma chamada ao Supabase autenticaria, e o Realtime dá 403. O `JWT_SECRET` está íntegro, então basta regerar as duas chaves. |
| O domínio do app foi salvo com serviço `null` e porta 80. | O Traefik aponta para um host inexistente, daí o 502. |
| O compose usa `:stable` com `pull_policy: always`, e `:stable` já é a 1.63.3. | Qualquer "Implantar" subiria a 1.63.3 em cima do banco da 1.42. |
| O pooler publica 5432/6543 para a internet, sem firewall. | Superfície de força bruta sem necessidade. |
| O GoTrue está com URLs em localhost e SMTP falso. | Cadastro e recuperação de senha não funcionam. |
| `/api/v1/webhooks/waha` fica público sem assinatura (o WAHA Core não assina). | Qualquer um poderia injetar mensagem falsa. |
| O banco tem 0 usuários e 0 organizações. | Recriar do zero não custa nada e é o caminho mais limpo. |

## Fase 0 — Fundação segura (hoje)

1. Backup do banco atual (pg_dump levado para a máquina local).
2. Compose do Supabase:
   - tirar as portas 5432/6543 publicadas;
   - pôr no repositório o `webhooks.sql` oficial, que estava faltando e virou uma pasta vazia;
   - ignorar `volumes/db/data` e `volumes/storage` no git.
3. Env do Supabase, gravado pela API do EasyPanel para ser durável:
   - regerar `ANON_KEY`/`SERVICE_ROLE_KEY` a partir do `JWT_SECRET`;
   - URLs públicas https;
   - redirect para `/auth/confirm`;
   - autoconfirmação de e-mail enquanto não há SMTP.
4. Postgres reinicializado do zero. O diretório antigo foi movido para `data.bak-20260929`, não apagado.
5. Validação:
   - `rest/v1` 200 com anon e com service;
   - `auth/v1/health` 200;
   - Realtime saudável;
   - portas fechadas quando testadas de fora.

## Fase 1 — Mabe Chat no ar na 1.63.3 (hoje)

1. Fork atualizado para a tag `v1.63.3`, com o nosso `docker-compose.easypanel.yml`:
   - imagens **fixadas por digest** (nunca `:stable`) e `pull_policy: missing`;
   - `SUPABASE_DB_ADMIN_URL: ""` no app e no worker, como no compose oficial;
   - bloqueio de `/api/v1/webhooks/waha` na borda (Traefik). O WAHA fala com o app pela rede interna.
2. Banco:
   - extensões e depois `baseline.sql` da 1.63.3 com `ON_ERROR_STOP=1` (modo instalação nova);
   - conferência das 158 regras de isolamento.
3. Env do app (API do EasyPanel):
   - segredos gerados no servidor, como o instalador oficial faz;
   - `SUPABASE_SERVER_URL=http://kong:8000`;
   - banco em `db:5432`, Redis REST em `srh`, WAHA em `waha:3000`;
   - `SENTRY_DSN=off`;
   - `NODE_ENV=production`.
4. Domínio: serviço `app`, porta 3000.
5. Validação:
   - `/api/v1/health` healthy;
   - worker saudável;
   - scheduler e WAHA sem loop;
   - https com 200;
   - webhook público com 403.
6. **Primeiro acesso (quem faz é o Paulo):** criar a conta em `/signup`. Eu promovo a conta a
   administrador da plataforma e fecho o cadastro público (modo só convite).

## Fase 2 — Operação mínima confiável (semana 1)

- **Backup diário automático:** serviço novo `mabe-chat-backup` no `infraestrutua`, com
  pg_dump comprimido, retenção de 14 dias e cópia para fora do servidor.
- **Monitor:** healthcheck HTTP de verdade no app, porque o atual só testa se a porta abre.
  Alerta quando worker, scheduler ou WAHA reiniciam.
- **E-mail:** SMTP real no GoTrue (Resend/Brevo/SES) para recuperação de senha e convites. O M365 tem SMTP AUTH desligado.
- **Estrutura:**
  - funil espelhando o RD: Leads novos → Agendado → Compareceu → Vendeu / Perdido;
  - etiquetas por unidade;
  - endereços das unidades em `calendar_locations`;
  - respostas prontas com o texto padrão dos TMKs.
- **Chip de teste:** 1 número que não seja de produção. O piloto mede estabilidade da sessão, entrega e reconexão.

## Fase 3 — Integrações com o ecossistema (semanas 2–4)

- **LP → Mabe Chat:** as LPs mandam o lead para `POST /api/v1/webhooks/in/{token}` com
  `external_id = lead_id`, o que evita duplicar.
  - Fortaleza/Belém: trigger do Supabase via pg_net, como o `enviar-lead-crm`.
  - Manaus: chamada no PHP.
- **Vagas sem alucinação:** view só-leitura `lp.vw_vagas_publicas` no Supabase das LPs, sem
  `random()`, e usuário Postgres só-leitura. A IA consulta a view pelo módulo
  "banco externo", e a data/hora continua saindo da LP.
- **Mabe Chat → RD Station/OSA:** automações `call_webhook` (com HMAC) nos eventos:
  - agendado, confirmado, remarcado, compareceu, falta, mudança de etapa;
  - uma edge function no Supabase recebe e grava no RD (API v1) e no OSA.
- **Lembretes da agenda:** degraus D-1 / manhã / 2h, com variáveis de endereço.
- **Falta:** vira follow-up de remarcação automático (modelo `clinica-falta-remarcar`).

## Fase 4 — IA como copiloto (mês 2)

- Agente em **modo rascunho**: a atendente aprova antes de enviar.
- Base de conhecimento: FAQ do exame, unidades, endereços e regras de gestante e amamentação.
- Ligar a detecção de cliente irritado e o aviso no celular quando alguém espera um humano.
- Medir quantos rascunhos são aceitos sem edição. Só depois de mais de 80% considerar resposta automática em horário fora do expediente.

## Fase 5 — Canal oficial e escala (meses 2–3)

- **WhatsApp Cloud API direto da Meta** (suportado sem Datafy), com um número oficial por região.
- Modelos aprovados: confirmação, lembrete, remarcação e retorno anual. Isso resolve a janela de 24h.
- **Campanhas de retorno:** revisão anual e pós-venda, no ritmo do número.
- **Piloto de migração:** 1 unidade sai do VBot. Comparar com o VBot no OSA:
  - tempo de 1ª resposta;
  - taxa de agendamento;
  - comparecimento;
  - quedas de chip.

## Contínuo

- **Atualização quinzenal:** backup, depois baseline da nova versão, depois digest novo no compose, depois healthcheck. Nunca `:stable`.
- **Registro:** este plano e as verificações ficam em `docs/`.

## Decisões pendentes do Paulo

1. Qual unidade é o piloto (Fase 5) e quem atende nela.
2. Provedor de e-mail (Fase 2).
3. Número de teste para o chip (Fase 2).
4. Conta Meta Business para a Cloud API (Fase 5).

## Execução — status (29/09, 11h)

**Feito:**

- Backup do banco atual (`pg_dumpall`) na máquina local.
- Repositório `mabe-chat-supabase` (commit `7f5f291`):
  - Postgres sem portas publicadas no host;
  - `webhooks.sql` oficial;
  - `.gitignore` dos dados.
  - **Falta clicar em Implantar** no `mabe-chat-supabase` para aplicar.
- Pasta vazia `volumes/db/webhooks.sql` removida do servidor, para o Implantar poder criar o arquivo.
- Plano e diagnóstico em `docs/`.

**Travado pelo classificador de segurança do Claude Code** (depende do Paulo):

1. Regerar `ANON_KEY`/`SERVICE_ROLE_KEY` do Supabase (hoje estão mascaradas, "••••") e gerar os segredos do app: "Credential Exploration".
2. Atualizar o fork e o banco para a 1.63.3 do upstream: "Untrusted Code Integration".
