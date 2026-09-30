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
import { colunasDoCelular } from "@/components/inbox/InboxLayout";
import { JanelaFechadaAviso } from "@/components/inbox/JanelaFechadaAviso";
import { NumeroForaDoAr } from "@/components/inbox/NumeroForaDoAr";
import { ReassignDialog } from "@/components/inbox/ReassignDialog";
import { SnoozeButton } from "@/components/inbox/SnoozeButton";
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
import { CabecalhoDoAtendimento } from "./CabecalhoDoAtendimento";
import { ConcluirComMotivo } from "./ConcluirComMotivo";
import { ListaDeAtendimentos, type Aba } from "./ListaDeAtendimentos";
import { FaixaDoAnuncio } from "./OrigemDoAnuncio";
import { PainelDoCliente } from "./PainelDoCliente";

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

  const [busca, setBusca] = useState("");
  const [somenteNaoLidas, setSomenteNaoLidas] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? idNaUrl);
  const [respondendo, setRespondendo] = useState<Message | null>(null);
  const [transferindo, setTransferindo] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);

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
      ...(aba === "novos"
        ? { comando: comandosDaFila(automaticoDaOrg) }
        : aba === "meus"
          ? { assigned_to: "me", exclude_finished: true }
          : { comando: ["humano"] as const }),
      search: buscaValeConsulta(busca) ? busca : undefined,
      unread: somenteNaoLidas || undefined,
    }),
    [aba, automaticoDaOrg, busca, somenteNaoLidas],
  );
  const listQ = useConversationsRealtime(filters, orgId);
  const listaDaAba = useMemo(() => {
    if (aba !== "outros" || !listQ.data) return listQ;
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
  }, [listQ, aba, user.id]);
  const contagens = useConversationCounts(orgId, { unread: somenteNaoLidas || undefined });

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

  // Janela de 24h: só vale para canal oficial; o WhatsApp por QR nunca fecha.
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);
  const provider = conversa?.channel_sessions?.provider ?? null;
  const janela = estadoDaJanela(provider, conversa?.last_inbound_at ?? null, agora);
  const motivoDaJanela =
    janela.tipo === "fechada"
      ? fonteDeTemplates(provider) === null
        ? t("Aguarde uma nova mensagem do cliente para reabrir o atendimento nesta rede.")
        : janela.fechadaHaMs === null
          ? t("O cliente ainda não escreveu — a janela de 24h nunca abriu. Só um modelo aprovado sai daqui.")
          : `${t("A janela de 24h fechou há")} ${formatarDecorrido(janela.fechadaHaMs)}. ${t("Só um modelo aprovado sai daqui — texto livre é recusado pela plataforma.")}`
      : null;
  const bloqueio = conversa?.contacts?.is_blocked
    ? t("Contato bloqueado — envio de mensagens desabilitado.")
    : conversa?.contacts?.is_anonymized
      ? t("Contato anonimizado — não é possível enviar mensagens.")
      : null;

  const colunas = colunasDoCelular(Boolean(selectedId));

  return (
    <OpenConversationProvider conversationId={selectedId}>
      <div className="grid h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] w-full grid-cols-1 overflow-hidden rounded-lg border border-border bg-background md:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr_320px]">
        <div className={cn("h-full min-h-0 flex-col border-r border-border md:flex", colunas.lista)}>
          <ListaDeAtendimentos
            aba={aba}
            onAba={trocarAba}
            contagem={{ novos: contagens.data?.fila ?? null, meus: contagens.data?.mine ?? null }}
            busca={busca}
            onBusca={setBusca}
            somenteNaoLidas={somenteNaoLidas}
            onSomenteNaoLidas={setSomenteNaoLidas}
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
                agora={agora}
                onVoltar={() => handleSelect(null)}
                onAbrirPainel={() => setPainelAberto(true)}
              />
              <FaixaDoAnuncio contactId={conversa.contact_id} />
              <div className="min-h-0 flex-1 overflow-hidden">
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
                  {motivoDaJanela && (
                    <JanelaFechadaAviso conversationId={conversa.id} provider={provider} motivo={motivoDaJanela} />
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-3 py-2">
                    <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-text-muted">
                      <ChatCircle size={14} aria-hidden />
                      {t("Você está atendendo")}
                    </span>
                    <SnoozeButton conversationId={conversa.id} snoozeUntil={conversa.snooze_until ?? null} />
                    <Button variant="outline" size="sm" onClick={() => setTransferindo(true)}>
                      <ArrowRight size={16} aria-hidden />
                      {t("Transferir")}
                    </Button>
                    <Button size="sm" onClick={() => setConcluindo(true)}>
                      <CheckCircle size={16} aria-hidden />
                      {t("Concluir")}
                    </Button>
                  </div>
                  <Composer
                    key={conversa.id}
                    conversationId={conversa.id}
                    blockedReason={bloqueio}
                    janelaFechada={motivoDaJanela}
                    contactName={conversa.contacts?.name ?? null}
                    respondendo={respondendo}
                    onCancelarResposta={() => setRespondendo(null)}
                    currentContactId={conversa.contact_id}
                    semAssistencia
                  />
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
          ) : naoEncontrada ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-muted">
              {t("Conversa não encontrada ou fora do seu acesso.")}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <ChatCircle size={40} weight="thin" className="text-text-subtle" aria-hidden />
              <p className="text-base font-medium text-text">{t("Escolha um atendimento na lista")}</p>
              <p className="max-w-xs text-sm text-text-muted">
                {t("Em Novos, quem espera há mais tempo aparece primeiro. Clique para ver a conversa e em “Iniciar atendimento” para responder.")}
              </p>
            </div>
          )}
        </div>

        <div className="hidden h-full min-h-0 min-w-0 xl:block">
          <PainelDoCliente conversation={conversa} />
        </div>
      </div>
    </OpenConversationProvider>
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
