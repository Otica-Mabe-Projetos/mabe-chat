# Mabe Chat — atualização e backup (EasyPanel)

O botão nativo **"Atualizar agora"** funciona nesta instalação pelo serviço
`atualizador` (`infra/atualizador-easypanel/`). Ele não aparece no menu de
Configurações. O caminho até ele é o link **"Nova versão · X"** no rodapé da barra
lateral, que só aparece quando há versão nova, ou o endereço direto
`/app/settings/atualizacao`. O serviço faz
o papel do `hostgator-setup-kit/agent.sh` + `update.sh` oficiais, que não servem no
EasyPanel, e fala o mesmo protocolo com o app (`POST /api/v1/system/agent`).

A página de atualização só aparece para **administrador da plataforma**
(`public.platform_admins`). Para quem não é admin, o endereço dá 404.

- **Admin atual:** a conta do Paulo, promovida em 29/09/2026 com o mesmo INSERT do
  `install.sh` oficial.
- **Cadastro:** desde 29/09/2026 está em **só por convite** (`platform_settings.signup_mode`),
  e muda em Admin › Cadastro.
- **GoTrue fechado:** desde 29/09/2026, `DISABLE_SIGNUP=true` no Supabase (`mabe-chat-supabase`).
  Isso fecha o cadastro direto com a anon key. Convites seguem funcionando: desde a issue
  #1653 (`lib/auth/convite-no-gotrue.ts`), o app cria a conta de quem foi convidado pela
  admin API. O "Cadastrar membro" também usa a admin API.
- **`INTERNAL_SECRET` trocado** em 29/09/2026 (gerado no servidor, aba Ambiente). Conferido:
  o scheduler chama o app com a chave nova (200); com uma chave errada, 401.

## Como uma atualização acontece

1. A cada 5 minutos o agente anuncia ao app a versão instalada e a última release
   estável do DeskcommCRM (GitHub). Ele só anuncia quando as 3 imagens já foram
   publicadas no ghcr: a **nossa** do app, montada com as personalizações (ver
   [PERSONALIZACOES-MABE-CHAT.md](PERSONALIZACOES-MABE-CHAT.md)), e as oficiais do worker
   e do scheduler. O painel mostra "Atualizar agora" e o changelog.
2. Você clica. Em até 5 minutos o agente pega o pedido e executa:
   1. **backup:** `pg_dump` do banco, conferido lendo o dump de volta, mais o
      Storage (anexos/mídias) e as sessões do WhatsApp. Sem backup legível, para aqui.
   2. **código:** baixa as imagens novas (app, worker, scheduler) com tudo ainda no ar.
   3. **banco:**
      - pausa app, worker e scheduler, e também rest, studio e realtime do Supabase;
      - aplica o `supabase/baseline.sql` da versão nova (idempotente: não apaga dado);
      - repete se houver disputa;
      - confere as regras de isolamento e recria só as que faltarem.
   4. Troca a versão (tag local `mabe-chat/*:atual`, a anterior vira `:anterior`) e
      sobe só app, worker e scheduler. **O WhatsApp (WAHA) não reinicia.**
   5. Confere a saúde (`/api/v1/health`). **Se a versão nova não subir saudável, volta
      sozinho para a anterior.**
3. O painel mostra o resultado e as últimas linhas do log.

Tempo fora do ar medido: **~40 segundos** (teste em 29/09/2026). Prefira horário de
pouco movimento.

**Não clique em "Implantar" no EasyPanel durante uma atualização**, porque isso
recria o próprio agente. Um Implantar **nunca troca a versão**: o compose usa as
tags locais com `pull_policy: never`.

## Onde ficam os dados

| Dado | Onde fica no servidor |
|---|---|
| Banco (contatos, conversas, mensagens, negócios, usuários, configurações) | `/etc/easypanel/projects/infraestrutua/mabe-chat-supabase/code/volumes/db/data` (Postgres do `supabase-db`) |
| Arquivos (anexos, mídias, fotos) | `/etc/easypanel/projects/infraestrutua/mabe-chat-supabase/code/volumes/storage` |
| Sessões do WhatsApp | volume Docker `infraestrutua_mabe-chat-app_waha-data` |
| Backups | volume Docker `infraestrutua_mabe-chat-app_backups` (`/backups` dentro do agente) |

⚠️ **Nunca usar "Destroy"** nos serviços `mabe-chat-app` e `mabe-chat-supabase`, nem
trocar a fonte para "inline". Isso apaga a pasta `code/`, que contém o banco e os arquivos.

## Backups

- **Diário às 3h** (America/Manaus) e **antes de toda atualização**. Ficam os 14 mais novos.
- Cada pasta contém:
  - `banco.dump` (formato custom do pg_dump);
  - `storage.tgz`;
  - `whatsapp-sessoes.tgz`;
  - `SHA256SUMS`;
  - `INFO` (versão e número de objetos do banco).
- Backup na hora:

  ```bash
  docker exec infraestrutua_mabe-chat-app-atualizador-1 bash /usr/local/bin/atualizador.sh backup manual
  ```

- Baixar todos os backups para o computador:

  ```bash
  ssh root@z07ybu.easypanel.host "docker run --rm -v infraestrutua_mabe-chat-app_backups:/b alpine tar cz -C /b ." > backups-mabe-chat.tgz
  ```

**Limite conhecido:** os backups ficam **no mesmo servidor**. Eles protegem contra
atualização ruim e erro humano, mas não contra perder a VPS. A cópia para fora (nuvem)
é o próximo passo.

## Restaurar (só se precisar)

Faça sempre **primeiro num banco de teste**, para conferir o conteúdo:

```bash
docker exec supabase-db createdb -U postgres restauracao_teste
docker cp <pasta>/banco.dump supabase-db:/tmp/b.dump
docker exec supabase-db pg_restore -U postgres -d restauracao_teste /tmp/b.dump
```

Depois confira as tabelas e, por fim, `dropdb restauracao_teste`.

Restaurar a produção de verdade (substituir o banco) é uma operação assistida:

1. Parar app, worker e scheduler.
2. Mover o `data/` atual para `.bak`. Nunca apagar.
3. Reiniciar o `supabase-db` limpo e restaurar o dump.
4. Restaurar o `storage.tgz`.

## Servidor novo / recriar as tags

O compose espera as tags locais. Num Docker novo, crie-as a partir da versão desejada:

O app vem da **nossa** imagem (oficial + personalizações, ver
[PERSONALIZACOES-MABE-CHAT.md](PERSONALIZACOES-MABE-CHAT.md)). Worker e scheduler vêm das
oficiais.

```bash
V=1.64.0
docker pull ghcr.io/otica-mabe-projetos/mabe-chat-app:$V && docker tag ghcr.io/otica-mabe-projetos/mabe-chat-app:$V mabe-chat/app:atual
for n in worker scheduler; do
  docker pull ghcr.io/melgarafael/deskcomm-$n:$V && docker tag ghcr.io/melgarafael/deskcomm-$n:$V mabe-chat/$n:atual
done
```

## Atualizar pela linha de comando

Faz o mesmo processo do botão, sem registrar no painel:

```bash
docker exec infraestrutua_mabe-chat-app-atualizador-1 bash /usr/local/bin/atualizador.sh atualizar v1.63.5
```

## Testes feitos em 29/09/2026

| Teste | Resultado |
|---|---|
| Atualização de ponta a ponta 1.63.3 → 1.63.3 | backup ok (2,7 MB, 4.412 objetos), baseline aplicado na 1ª passada, 158/158 regras, healthy em 40 s |
| Volta automática (falha de saúde simulada) | voltou para a anterior e ficou healthy |
| Protocolo com o app | heartbeat gravado (v1.63.3 → v1.63.5 disponível, changelog 7 KB); progresso e resultado aceitos pelo schema; sem segredo = 401 |
| **1ª atualização real pelo botão** (Paulo, 29/09 16:36 Belém) | 1.63.3 → 1.63.6 `success` em ~5 min de ponta a ponta, backup `20260929-153949-antes-de-v1.63.6`, dados intactos, tudo healthy |
| Troca para a **nossa** imagem (pela linha de comando, 29/09 19:12 Belém) | 1.64.0 oficial → 1.64.0 nossa, com pacote privado lido pelo `GHCR_TOKEN`. Backup `20260929-181224-antes-de-v1.64.0` (3,5 MB, 4.414 objetos), baseline na 1ª passada, 158/158 regras, healthy em 55 s. Rotas novas respondem 401 sem login |
