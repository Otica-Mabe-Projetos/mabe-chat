# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **TMKs (telemarketing) das unidades da Ótica Mabe.** Respondem no WhatsApp quem chega dos
  anúncios (Meta Ads, campanhas como o Projeto Social de exame de vista grátis + armação),
  tiram dúvidas e agendam o exame numa loja/unidade.
- **Vendedores e consultores das lojas.** Atendem pós-venda, retorno e orçamento pelo mesmo
  canal.
- **Gestores e admin** (marketing e operação). Configuram, acompanham e redistribuem. É uma
  audiência secundária desta tela: para eles, a interface completa continua existindo.

## Product Purpose

Mabe Chat é a plataforma própria de atendimento por WhatsApp + CRM da Ótica Mabe. É um fork
do DeskcommCRM com personalizações da Mabe e substitui o VBot no atendimento. Sucesso é o lead
do anúncio ser respondido rápido, não esfriar e virar exame agendado. No pós-venda, sucesso é
o cliente resolvido sem trocar de ferramenta.

## Positioning

Ferramenta da própria Mabe: os dados, os números de WhatsApp, o funil e a identidade são da
empresa, e a tela é moldada ao jeito de trabalhar das unidades, não a um SaaS genérico. As
atualizações oficiais continuam chegando por baixo das personalizações.

## Operating Context

- Atendimento em computador, no Chrome e em tela cheia. Esta é uma inferência dos prints do VBot
  em 1920 px; ainda não foi confirmado se há uso em notebook pequeno ou celular.
- O jeito de trabalhar que a equipe já conhece (VBot) e que precisa ser mantido:
  - abas **Novos / Meus / Outros** (fila de quem chegou, os meus atendimentos, os dos colegas);
  - **"Iniciar" antes de responder**: o atendente assume a conversa, para dois não
    responderem o mesmo cliente;
  - **Transferir** para colega ou unidade;
  - **Concluir com motivo**.
- Também existe no VBot, sem pedido de manter: o **tempo de expiração** do atendimento
  ("Atendimento expira em"). Paulo não marcou como necessário.
- Todo lead de anúncio chega com origem, campanha e texto do anúncio. No VBot isso aparece
  como um cartão de "Rastreamento" dentro da conversa.
- Iniciar conversa pelo número (+55) fica à mão, embaixo da lista.
- Prioridades à mão na tela, confirmadas por Paulo em 29/09/2026:
  1. responder rápido quem chegou;
  2. agendar sem sair da conversa;
  3. ver de qual anúncio veio;
  4. transferir entre unidades.

## Capabilities and Constraints

- Stack: Next.js 16 + Tailwind 4 + Supabase (fork do DeskcommCRM).
- **Personalizações vivem em arquivos próprios** na branch `personalizacoes`. O CI aplica essas
  personalizações sobre cada release oficial, e alteração que não encaixa segura a versão.
  Edição em tela oficial deve ser mínima e marcada ("Personalização Ótica Mabe").
- A doutrina upstream do `ConversationHeader` recusa menu "mais", porque esconderia ação de quem
  atende. Qualquer tela de atendimento com outra hierarquia precisa ser nossa, e não uma
  alteração do header oficial.
- WhatsApp via WAHA (não oficial): o primeiro texto livre é permitido.
- Papéis: `viewer`, `agent`, `manager`, `admin`. Cada vínculo tem interface `completa` ou
  `simplificada`, que filtra o menu.
- Já existe e deve ser reaproveitado:
  - Inbox (Fila / Minhas / Todas / Fechadas / Arquivadas);
  - Assumir / Liberar / Transferir / Lembrar / Fechar / Arquivar;
  - etiquetas, Funis (kanban), Agenda, Contatos, Respostas rápidas;
  - envio de texto, mídia e áudio;
  - "Nova conversa" pelo número e "Cadastrar membro", que são nossas.
- Agente de IA existe, mas não está configurado. Os recursos de IA não devem dominar a tela do
  atendente.
- **Indefinido:**
  - onde o agendamento é gravado (Agenda do Mabe Chat, sistema das LPs ou RD Station) e como
    ele aparece ao lado da conversa;
  - quais motivos de conclusão a operação usa;
  - se vendedores de loja e TMKs precisam de telas diferentes.

## Brand Commitments

- Nome do produto: **Mabe Chat**. Empresa: **Ótica Mabe**.
- Paulo pediu (29/09/2026) o visual com a paleta e as características da Mabe. Fonte da paleta:
  `landing-mabe-influenciadores/assets/css/style.css`, espelhada em `osa-painel/src/index.css`.
  - amarelo `#ffb100` / `#ffcc5a` / `#de9a00`
  - preto `#14120f` / `#1c1a16` / `#0c0a08`
  - dourado `#a8802e` / `#c9a24a` / `#7a5b1e`
  - neutros `#ffffff`, `#f6f5f2`, `#e7e5df`, `#4a4a48`, `#767470`
- Símbolo: óculos dourados com traço embaixo (`osa-painel/public/logo-simbolo.png`).
- O Mabe Chat tem marca oficial configurável (Admin › Marca: nome, logo claro/escuro, favicon,
  uma cor de destaque). Hoje só o nome está definido.

## Evidence on Hand

- Prints da tela de atendimento do VBot enviados por Paulo no chat (29/09/2026): lista, conversa
  aberta e aba Meus. Eles têm dados de clientes e **não** entram no repositório, que é público.
- Nenhum depoimento, métrica ou case pode ser inventado para a interface.

## Product Principles

1. **Primeira resposta rápida vence tudo.** Lead de anúncio esfria em minutos; a tela empurra o
   atendente para quem está esperando.
2. **Quem atende vê só o trabalho de atender.** Gestão, IA e configuração ficam para quem
   administra; o atendente não tropeça nelas.
3. **Contexto sem sair da conversa.** Origem do anúncio, unidade, agendamento e histórico ficam
   ao lado do chat, não em outra tela.
4. **Um dono por conversa, e o fim registrado.** "Iniciar" antes de responder e "Concluir com
   motivo" existem para a operação não se atropelar e para a gestão ter dado.
5. **Continuar atualizável.** Toda mudança nasce isolada, para as versões oficiais seguirem
   chegando.
