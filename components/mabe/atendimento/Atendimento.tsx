"use client";
/**
 * Mesa do atendente — personalização da Ótica Mabe, fora do upstream.
 *
 * Uma fila para esvaziar, não um CRM para explorar: Novos (quem ninguém atendeu,
 * quem espera há mais tempo primeiro), Meus e Outros, como no VBot que a equipe já
 * usa. "Iniciar atendimento" antes de responder, Transferir, Concluir com motivo e
 * de onde o lead veio — o resto (IA, demandas, gestão) fica no Inbox completo.
 *
 * Só monta peças oficiais (lista, conversa, compositor, transferência); a regra de
 * fila, o tempo real e os envios são os do produto. Decisão de desenho em
 * `.impeccable/surfaces/app-app-inbox-page-tsx.md` e `PRODUCT.md`.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { ChatThread } from "@/components/inbox/ChatThread";
import { Composer } from "@/components/inbox/Composer";
import { JanelaFechadaAviso } from "@/components/inbox/JanelaFechadaAviso";
import { NumeroForaDoAr } from "@/components/inbox/NumeroForaDoAr";
import { ReassignDialog } from "@/components/inbox/ReassignDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAutomaticoAtivo } from "@/hooks/ai/useAutomaticoAtivo";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useClaimConversation } from "@/hooks/inbox/useClaimConversation";
import { useReopenConversation } from "@/hooks/inbox/useCloseConversation";
import { useConversation, isNotFound } from "@/hooks/inbox/useConversation";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import {
  useConversationsRealtime,
  type ConversationsFilters,
  type ConversationWithContact,
} from "@/hooks/inbox/useConversationsRealtime";
import { useMarkAsRead } from "@/hooks/inbox/useMarkAsRead";
import { OpenConversationProvider } from "@/hooks/notifications/OpenConversationContext";
import { ROLE_RANK } from "@/lib/auth/types";
import { estadoDaJanela, formatarDecorrido } from "@/lib/channels/janela";
import { fonteDeTemplates } from "@/lib/channels/templates-fonte";
import { comandosDaFila } from "@/lib/inbox/comando-da-conversa";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import type { Message } from "@/lib/types/messaging";
import { ArrowRight, ChatCircle, CheckCircle, Play } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import { AjudaDosAtalhos } from "./AjudaDosAtalhos";
import { CabecalhoDoAtendimento } from "./CabecalhoDoAtendimento";
import { ConcluirComMotivo } from "./ConcluirComMotivo";
import { numeroPermitido, useMabe } from "@/components/mabe/ajustes/ProvedorMabe";
import { ListaDeAtendimentos, type Aba } from "./ListaDeAtendimentos";
import { colunasDoCelular, useAgora } from "./espera";
import { FaixaDoAnuncio } from "./OrigemDoAnuncio";
import { PainelDoCliente } from "./PainelDoCliente";
import { useAtalhosDaMesa } from "./useAtalhosDaMesa";

const ABAS: Aba[] = ["novos", "meus", "outros"];
const ENCERRADOS = new Set(["closed", "archived", "resolved"]);

function lerAba(v: string | null): Aba {
  return ABAS.includes(v as Aba) ? (v as Aba) : "novos";
}

export function Atendimento({ initialSelectedId = null }: { initialSelectedId?: string | null }) {
  const t = useT();
  const { activeOrg, user } = useAuth();
  const orgId = activeOrg?.orgId ?? null;
  const somenteLeitura = user.support?.access_mode === "support_readonly";
  const gerente = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const aba = lerAba(searchParams.get("aba"));
  const idNaUrl = searchParams.get("id");
  // Filtro de loja = um número (channel_session_id) na URL, para sobreviver ao recarregar.
  const { numerosPermitidos, ordemDaLista, lojaDosNumeros } = useMabe();
  const numeroNaUrl = searchParams.get("numero");
  const numero =
    numeroNaUrl && /^[0-9a-f-]{36}$/i.test(numeroNaUrl) && numeroPermitido(numerosPermitidos, numeroNaUrl)
      ? numeroNaUrl
      : null;
  const loja = searchParams.get("loja");
  // Supervisão: ?atendente=<id> mostra as conversas em andamento de uma pessoa.
  const atendenteNaUrl = searchParams.get("atendente");
  const atendente = atendenteNaUrl && /^[0-9a-f-]{36}$/i.test(atendenteNaUrl) ? atendenteNaUrl : null;
  const nomeDoAtendente = searchParams.get("nome");
  // Filtro de loja = TODOS os números dela que a pessoa enxerga.
  const numerosDaLoja = useMemo(
    () =>
      loja
        ? Object.entries(lojaDosNumeros ?? {})
            .filter(([id, l]) => l.codigo === loja && numeroPermitido(numerosPermitidos, id))
            .map(([id]) => id)
        : null,
    [loja, lojaDosNumeros, numerosPermitidos],
  );
  // O seletor fala em "loja:COD" ou "numero:ID"; a URL guarda ?loja= ou ?numero=.
  const selecao = loja ? `loja:${loja}` : numero ? `numero:${numero}` : null;

  const [busca, setBusca] = useState("");
  const [somenteNaoLidas, setSomenteNaoLidas] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? idNaUrl);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const [transferindo, setTransferindo] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  // Envolve o compositor: o atalho "r" foca o campo de resposta daqui de dentro.
  const caixaDaResposta = useRef<HTMLDivElement>(null);

  // Voltar/avançar do navegador e links com ?id= (funil, contatos, notificação).
  const ultimoIdNaUrl = useRef(idNaUrl);
  useEffect(() => {
    if (ultimoIdNaUrl.current === idNaUrl) return;
    ultimoIdNaUrl.current = idNaUrl;
    setSelectedId(idNaUrl);
    setRespondendo(null);
  }, [idNaUrl]);

  const trocarAba = useCallback(
    (nova: Aba) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("aba", nova);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const trocarNumero = useCallback(
    (novo: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("numero");
      params.delete("loja");
      if (novo?.startsWith("loja:")) params.set("loja", novo.slice(5));
      else if (novo?.startsWith("numero:")) params.set("numero", novo.slice(7));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      if (id === selectedId) return;
      setSelectedId(id);
      setRespondendo(null);
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("id", id);
      else params.delete("id");
      const query = params.toString();
      window.history.pushState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [selectedId, searchParams, pathname],
  );

  // A mesma regra de fila do Inbox oficial: sem agente de IA no ar, toda conversa
  // aberta sem dono está em Novos. Outros = as de colegas (dono humano, não eu).
  const { data: automaticoDaOrg } = useAutomaticoAtivo();
  const filters: ConversationsFilters = useMemo(
    () => ({
      ...(atendente
        ? { assigned_to: atendente, exclude_finished: true }
        : aba === "novos"
        ? { comando: comandosDaFila(automaticoDaOrg) }
        : aba === "meus"
          ? { assigned_to: "me", exclude_finished: true }
          : { comando: ["humano"] as const }),
      search: buscaValeConsulta(busca) ? busca : undefined,
      unread: somenteNaoLidas || undefined,
      channel_session_id: numerosDaLoja ? undefined : (numero ?? undefined),
      // Loja sem número visível: um id impossível, para a lista vir vazia e não inteira.
      numeros: numerosDaLoja ? (numerosDaLoja.length ? numerosDaLoja : ["00000000-0000-0000-0000-000000000000"]) : undefined,
      // Mais novas no topo (padrão da Mabe), inclusive em Novos.
      ordem: ordemDaLista === "espera" ? undefined : ("recentes" as const),
    }),
    [aba, automaticoDaOrg, busca, somenteNaoLidas, numero, numerosDaLoja, ordemDaLista, atendente],
  );
  const listQ = useConversationsRealtime(filters, orgId);
  const listaDaAba = useMemo(() => {
    if (atendente || aba !== "outros" || !listQ.data) return listQ;
    return {
      ...listQ,
      data: {
        ...listQ.data,
        pages: listQ.data.pages.map((p) => ({
          ...p,
          data: p.data.filter((c) => c.assigned_to_user_id !== user.id),
        })),
      },
    } as typeof listQ;
  }, [listQ, aba, user.id, atendente]);
  const contagens = useConversationCounts(orgId, {
    unread: somenteNaoLidas || undefined,
    channel_session_id: numerosDaLoja ? undefined : (numero ?? undefined),
    numeros: numerosDaLoja ? (numerosDaLoja.length ? numerosDaLoja : ["00000000-0000-0000-0000-000000000000"]) : undefined,
  });

  const inList = useMemo(
    () => listQ.data?.pages.flatMap((p) => p.data).find((c) => c.id === selectedId) ?? null,
    [listQ.data, selectedId],
  );
  const needsFetch = !!selectedId && !inList;
  const single = useConversation(selectedId, needsFetch);
  const conversa = inList ?? single.data ?? null;
  const naoEncontrada = needsFetch && !single.isPending && !single.data && isNotFound(single.error);

  const encerrada = conversa ? ENCERRADOS.has(conversa.status) : false;
  const semDono = !!conversa && conversa.assigned_to_user_id === null;
  const eMinha = !!conversa && conversa.assigned_to_user_id === user.id;
  // Espiar não marca como lida: só quem assumiu a conversa "lê" (como no VBot).
  useMarkAsRead(eMinha ? conversa.id : null, conversa?.unread_count_for_assignee ?? 0);

  const claim = useClaimConversation();
  const reabrir = useReopenConversation();
  const iniciar = () => {
    if (!conversa) return;
    claim.mutate(
      { conversation_id: conversa.id, expected_assignee: null },
      {
        onSuccess: () => {
          toast.success(t("Atendimento iniciado."));
          trocarAba("meus");
        },
      },
    );
  };

  const provider = conversa?.channel_sessions?.provider ?? null;
  const bloqueio = conversa?.contacts?.is_blocked
    ? t("Contato bloqueado — envio de mensagens desabilitado.")
    : conversa?.contacts?.is_anonymized
      ? t("Contato anonimizado — não é possível enviar mensagens.")
      : null;

  const idsDaAba = useMemo(
    () => listaDaAba.data?.pages.flatMap((p) => p.data.map((c) => c.id)) ?? [],
    [listaDaAba.data],
  );
  const podeAgir = !!conversa && !encerrada && !somenteLeitura;
  useAtalhosDaMesa({
    ativo: !transferindo && !concluindo && !painelAberto && !ajudaAberta,
    ids: idsDaAba,
    selecionado: selectedId,
    selecionar: handleSelect,
    podeIniciar: podeAgir && semDono && !claim.isPending,
    iniciar,
    podeConcluir: podeAgir && eMinha,
    concluir: () => setConcluindo(true),
    // Mesmas regras dos botões: dono, ou sem dono, ou gerente vendo colega.
    podeTransferir: podeAgir && (eMinha || semDono || gerente),
    transferir: () => setTransferindo(true),
    focarResposta: () => caixaDaResposta.current?.querySelector("textarea")?.focus(),
    mudarAba: trocarAba,
    abrirAjuda: () => setAjudaAberta(true),
  });

  const colunas = colunasDoCelular(Boolean(selectedId));

  return (
    <OpenConversationProvider conversationId={selectedId}>
      {/*
        De ponta a ponta: as margens negativas desfazem o `p-6` do <main> do
        AppShell (e o rodapé reservado, quando há peça fixa embaixo), então a
        altura é a janela menos a TopBar (h-14) menos o que o rodapé ocupa —
        exatamente a caixa de conteúdo do <main>, sem gerar rolagem na página.
        Colunas laterais mais estreitas no xl (como o InboxLayout oficial): a
        conversa é a coluna que mais importa e era a mais espremida em 1280px.
      */}
      <div className="mx-[calc(-1*var(--space-6))] mt-[calc(-1*var(--space-6))] mb-[calc(var(--rodape-ocupado,0px)_-_max(var(--space-6),var(--rodape-ocupado,0px)))] grid h-[calc(100dvh-3.5rem-var(--rodape-ocupado,0px))] grid-cols-1 overflow-hidden bg-background md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_296px] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
        <div className={cn("h-full min-h-0 flex-col border-r border-border md:flex", colunas.lista)}>
          <ListaDeAtendimentos
            aba={aba}
            onAba={trocarAba}
            contagem={{ novos: contagens.data?.fila ?? null, meus: contagens.data?.mine ?? null }}
            busca={busca}
            onBusca={setBusca}
            somenteNaoLidas={somenteNaoLidas}
            onSomenteNaoLidas={setSomenteNaoLidas}
            numero={selecao}
            numerosDaSelecao={numerosDaLoja ?? (numero ? [numero] : null)}
            atendente={atendente ? { nome: nomeDoAtendente || t("Atendente") } : null}
            onSairDoAtendente={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("atendente");
              params.delete("nome");
              router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }}
            onNumero={trocarNumero}
            listQuery={listaDaAba}
            filters={filters}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </div>

        <div className={cn("h-full min-h-0 min-w-0 flex-col md:flex", colunas.conversa)}>
          {conversa ? (
            <>
              <CabecalhoDoAtendimento
                conversa={conversa}
                eMinha={eMinha}
                onVoltar={() => handleSelect(null)}
                onAbrirPainel={() => setPainelAberto(true)}
                {...(eMinha && !encerrada && !somenteLeitura
                  ? { onTransferir: () => setTransferindo(true), onConcluir: () => setConcluindo(true) }
                  : {})}
              />
              {/* key: troca de conversa recomeça o estado aberto/fechado da faixa. */}
              <FaixaDoAnuncio
                key={conversa.id}
                contactId={conversa.contact_id}
                abertaDeInicio={semDono}
              />
              {/*
                Sem rolagem horizontal: o player de áudio oficial tem largura fixa
                (w-60) e, numa bolha limitada a 75% de uma coluna estreita, vazava
                pela direita. Aqui ele passa a caber na bolha (sem cortar nada), e
                o rolador da conversa fica só vertical e fino.
              */}
              <div className="min-h-0 flex-1 overflow-hidden [&>div>.overflow-y-auto]:overflow-x-hidden [&>div>.overflow-y-auto]:[scrollbar-width:thin] [&_[data-testid=message-bubble]_.w-60]:w-auto [&_[data-testid=message-bubble]_.w-60]:max-w-60">
                <ChatThread
                  conversationId={conversa.id}
                  provider={provider}
                  onResponder={eMinha ? setRespondendo : undefined}
                  dono={{
                    userId: conversa.assigned_to_user_id ?? null,
                    nome: conversa.assigned_to_user_name ?? null,
                  }}
                  contatoId={conversa.contacts?.id ?? null}
                />
              </div>

              {somenteLeitura ? (
                <Aviso>{t("Acompanhamento somente leitura.")}</Aviso>
              ) : encerrada ? (
                <Aviso
                  icone={<CheckCircle size={16} className="text-text-muted" aria-hidden />}
                  acao={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reabrir.isPending}
                      onClick={() => reabrir.mutate({ conversation_id: conversa.id })}
                    >
                      {t("Reabrir")}
                    </Button>
                  }
                >
                  {t("Atendimento concluído.")}
                </Aviso>
              ) : semDono ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-border bg-accent-soft px-4 py-3">
                  <p className="min-w-0 flex-1 text-sm text-text">
                    {t("Ninguém está atendendo este cliente ainda.")}
                  </p>
                  <Button variant="outline" size="sm" className="h-10" onClick={() => setTransferindo(true)}>
                    <ArrowRight size={16} aria-hidden />
                    {t("Transferir")}
                  </Button>
                  <Button
                    size="sm"
                    className="h-10 px-5 text-sm font-semibold"
                    disabled={claim.isPending}
                    onClick={iniciar}
                  >
                    <Play size={16} weight="fill" aria-hidden />
                    {claim.isPending ? t("Iniciando…") : t("Iniciar atendimento")}
                  </Button>
                </div>
              ) : eMinha ? (
                <>
                  {conversa.contacts?.id && (
                    <NumeroForaDoAr
                      key={`numero:${conversa.id}`}
                      conversationId={conversa.id}
                      channelSessionId={conversa.channel_session_id}
                      contactId={conversa.contacts.id}
                      contactPhone={conversa.contacts.phone_number ?? null}
                      onAbrirConversa={handleSelect}
                    />
                  )}
                  <div ref={caixaDaResposta}>
                    <ComposerComJanela
                      key={conversa.id}
                      conversa={conversa}
                      provider={provider}
                      bloqueio={bloqueio}
                      respondendo={respondendo}
                      onCancelarResposta={() => setRespondendo(null)}
                    />
                    <p className="hidden px-4 pb-2 text-xs text-text-muted md:block">
                      {t("Digite / para respostas rápidas · ? para atalhos")}
                    </p>
                  </div>
                </>
              ) : (
                <Aviso
                  acao={
                    gerente ? (
                      <Button variant="outline" size="sm" onClick={() => setTransferindo(true)}>
                        <ArrowRight size={16} aria-hidden />
                        {t("Transferir")}
                      </Button>
                    ) : null
                  }
                >
                  {t("Em atendimento com")} {conversa.assigned_to_user_name ?? t("um colega")}.
                </Aviso>
              )}

              <ReassignDialog
                conversationId={conversa.id}
                open={transferindo}
                onOpenChange={setTransferindo}
                numero={
                  conversa.contacts?.id
                    ? {
                        contactId: conversa.contacts.id,
                        contactPhone: conversa.contacts.phone_number ?? null,
                        channelSessionId: conversa.channel_session_id,
                        onAbrirConversa: handleSelect,
                      }
                    : undefined
                }
              />
              <ConcluirComMotivo
                conversationId={conversa.id}
                etiquetas={conversa.tags ?? []}
                open={concluindo}
                onOpenChange={setConcluindo}
              />
              <Sheet open={painelAberto} onOpenChange={setPainelAberto}>
                <SheetContent side="right" className="w-[min(22rem,90vw)] p-0 xl:hidden">
                  <SheetTitle className="sr-only">{t("Dados do cliente")}</SheetTitle>
                  <PainelDoCliente conversation={conversa} />
                </SheetContent>
              </Sheet>
            </>
          ) : needsFetch && single.isPending ? (
            <EsqueletoDaConversa />
          ) : needsFetch && single.isError && !naoEncontrada ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-text-muted">{t("Não foi possível abrir a conversa.")}</p>
              <Button variant="outline" size="sm" onClick={() => single.refetch()}>
                {t("Tentar de novo")}
              </Button>
            </div>
          ) : naoEncontrada ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-muted">
              {t("Conversa não encontrada ou fora do seu acesso.")}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <ChatCircle size={40} weight="thin" className="text-text-subtle" aria-hidden />
              <p className="text-base font-medium text-text">{t("Escolha um atendimento na lista")}</p>
              <p className="max-w-xs text-sm text-text-muted">
                {ordemDaLista === "espera"
                  ? t("Em Novos, quem espera há mais tempo aparece primeiro. Clique para ver a conversa e em “Iniciar atendimento” para responder.")
                  : t("As conversas mais recentes ficam no topo. Clique para ver a conversa e em “Iniciar atendimento” para responder.")}
              </p>
            </div>
          )}
        </div>

        <div className="hidden h-full min-h-0 min-w-0 xl:block">
          <PainelDoCliente conversation={conversa} />
        </div>
      </div>
      <AjudaDosAtalhos open={ajudaAberta} onOpenChange={setAjudaAberta} />
    </OpenConversationProvider>
  );
}

/**
 * Aviso da janela de 24h + compositor. O relógio mora aqui (e só liga em canal com
 * janela) para o tique de 30s não redesenhar a conversa inteira.
 */
function ComposerComJanela({
  conversa,
  provider,
  bloqueio,
  respondendo,
  onCancelarResposta,
}: {
  conversa: ConversationWithContact;
  provider: string | null;
  bloqueio: string | null;
  respondendo: Message | null;
  onCancelarResposta: () => void;
}) {
  const t = useT();
  // Janela de 24h: só vale para canal oficial; o WhatsApp por QR nunca fecha.
  // "sem_restricao" depende só do provedor, não da hora.
  const temJanela = estadoDaJanela(provider, null, new Date(0)).tipo !== "sem_restricao";
  const agora = useAgora(30_000, temJanela);
  const janela = estadoDaJanela(provider, conversa.last_inbound_at ?? null, agora);
  const motivoDaJanela =
    janela.tipo === "fechada"
      ? fonteDeTemplates(provider) === null
        ? t("Aguarde uma nova mensagem do cliente para reabrir o atendimento nesta rede.")
        : janela.fechadaHaMs === null
          ? t("O cliente ainda não escreveu — a janela de 24h nunca abriu. Só um modelo aprovado sai daqui.")
          : `${t("A janela de 24h fechou há")} ${formatarDecorrido(janela.fechadaHaMs)}. ${t("Só um modelo aprovado sai daqui — texto livre é recusado pela plataforma.")}`
      : null;

  return (
    <>
      {motivoDaJanela && (
        <JanelaFechadaAviso conversationId={conversa.id} provider={provider} motivo={motivoDaJanela} />
      )}
      {/* Lembrar, Transferir e Concluir moram no cabeçalho; aqui só se
          escreve. Duas linhas de altura útil sem rolagem interna. */}
      <div className="[&_textarea]:min-h-14">
        <Composer
          conversationId={conversa.id}
          blockedReason={bloqueio}
          janelaFechada={motivoDaJanela}
          contactName={conversa.contacts?.name ?? null}
          respondendo={respondendo}
          onCancelarResposta={onCancelarResposta}
          currentContactId={conversa.contact_id}
          semAssistencia
        />
      </div>
    </>
  );
}

/** Enquanto a conversa aberta por link (?id=) ainda carrega. */
function EsqueletoDaConversa() {
  return (
    <div className="flex h-full flex-col" aria-busy="true">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-elevated" />
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="h-3 w-40 animate-pulse rounded-md bg-surface-elevated" />
          <div className="h-2.5 w-24 animate-pulse rounded-md bg-surface-elevated" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {["55%", "40%", "62%"].map((largura, i) => (
          <div
            key={largura}
            className={cn("h-9 animate-pulse rounded-lg bg-surface-elevated", i % 2 ? "self-end" : "self-start")}
            style={{ width: largura }}
          />
        ))}
      </div>
    </div>
  );
}

function Aviso({
  children,
  icone,
  acao,
}: {
  children: ReactNode;
  icone?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border bg-surface-elevated px-4 py-3">
      {icone}
      <p className="min-w-0 flex-1 text-sm text-text-muted">{children}</p>
      {acao}
    </div>
  );
}
