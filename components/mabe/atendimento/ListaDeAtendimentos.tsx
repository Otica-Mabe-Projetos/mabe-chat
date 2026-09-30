"use client";
/**
 * Coluna da lista da mesa do atendente — personalização da Ótica Mabe.
 *
 * As abas do VBot que a equipe já conhece (Novos / Meus / Outros), o filtro de não
 * lidas, a busca e, fixo embaixo, "Conversar" pelo número. A lista em si é a
 * oficial (`ConversationList`): mesma ordem da fila (quem espera há mais tempo
 * primeiro), mesmo tempo real.
 */
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ConversationList } from "@/components/inbox/ConversationList";
import { useAbrirConversa } from "@/components/inbox/NovaConversa";
import { Button } from "@/components/ui/button";
import { numeroPermitido, useMabe } from "@/components/mabe/ajustes/ProvedorMabe";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationsFilters, useConversationsRealtime } from "@/hooks/inbox/useConversationsRealtime";
import { MagnifyingGlass } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import { AlternarModo } from "./AlternarModo";

export type Aba = "novos" | "meus" | "outros";

interface Props {
  aba: Aba;
  onAba: (aba: Aba) => void;
  contagem: { novos: number | null; meus: number | null };
  busca: string;
  onBusca: (v: string) => void;
  somenteNaoLidas: boolean;
  onSomenteNaoLidas: (v: boolean) => void;
  /** Filtro de loja: "loja:COD" ou "numero:ID", ou `null` para todas. */
  numero: string | null;
  /** Os números cobertos pelo filtro (todos os da loja), ou `null` sem filtro. */
  numerosDaSelecao: string[] | null;
  onNumero: (valor: string | null) => void;
  // A mesma forma que `ConversationList` recebe do Inbox oficial.
  listQuery: ReturnType<typeof useConversationsRealtime>;
  filters: ConversationsFilters;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ListaDeAtendimentos(props: Props) {
  const t = useT();
  const abas: Array<{ id: Aba; rotulo: string; n: number | null }> = [
    { id: "novos", rotulo: t("Novos"), n: props.contagem.novos },
    { id: "meus", rotulo: t("Meus"), n: props.contagem.meus },
    { id: "outros", rotulo: t("Outros"), n: null },
  ];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        // O item selecionado do `ConversationListItem` (upstream) usa `bg-accent-50`,
        // uma parada CLARA fixa que não muda com o tema: no escuro o nome e a prévia,
        // em texto claro, sumiam. `accent-soft` é o tingido que a régua de contraste
        // da marca calcula para cada tema. `!` porque o upstream também fixa o hover.
        "[&_[aria-current=true]]:bg-accent-soft!",
        // Na mesa tudo é WhatsApp: o selo do canal no avatar só competia com a bolinha de status.
        "[&_[data-conversation-id]>div>[role=img]]:hidden",
      )}
    >
      <div className="border-b border-border">
        <div className="flex items-center gap-1 px-2" role="tablist" aria-label={t("Atendimentos")}>
          {abas.map((a) => {
            const ativa = props.aba === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => props.onAba(a.id)}
                className={cn(
                  "flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm transition-colors",
                  ativa
                    ? "border-accent font-semibold text-text"
                    : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {a.rotulo}
                {a.n !== null && a.n > 0 && (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-xs font-semibold tabular-nums",
                      a.id === "novos" ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-text-muted",
                    )}
                  >
                    {a.n > 999 ? "999+" : a.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <SeletorDeLoja numero={props.numero} onNumero={props.onNumero} />
        <div className="flex items-center gap-2 px-3 pb-3 pt-2.5">
          <div className="flex shrink-0 rounded-md bg-surface-elevated p-0.5" role="group" aria-label={t("Filtro")}>
            {[
              { v: false, rotulo: t("Todas") },
              { v: true, rotulo: t("Não lidas") },
            ].map((f) => (
              <button
                key={String(f.v)}
                type="button"
                aria-pressed={props.somenteNaoLidas === f.v}
                onClick={() => props.onSomenteNaoLidas(f.v)}
                className={cn(
                  "min-h-8 rounded-sm px-2.5 text-xs transition-colors",
                  props.somenteNaoLidas === f.v
                    ? "bg-accent-soft font-medium text-text"
                    : "text-text-muted hover:text-text",
                )}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          <label className="flex min-h-9 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border px-2 focus-within:ring-2 focus-within:ring-accent">
            <MagnifyingGlass size={14} className="shrink-0 text-text-subtle" aria-hidden />
            <input
              type="search"
              value={props.busca}
              onChange={(e) => props.onBusca(e.target.value)}
              placeholder={t("Buscar…")}
              aria-label={t("Buscar nome ou telefone")}
              className="min-h-8 w-full min-w-0 bg-transparent text-sm outline-hidden placeholder:text-text-muted"
            />
          </label>
          <AlternarModo para="completo" compacto />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <ConversationList
          listQuery={props.listQuery}
          filters={props.filters}
          selectedId={props.selectedId}
          onSelect={props.onSelect}
          onLimparFiltros={() => {
            props.onBusca("");
            props.onSomenteNaoLidas(false);
            props.onNumero(null);
          }}
        />
      </div>

      <ConversarPeloNumero numerosDaSelecao={props.numerosDaSelecao} />
    </div>
  );
}

/** Os números (lojas) que esta pessoa enxerga, na ordem da tela de Conexões. */
function useNumerosDaPessoa() {
  const { data: sessoes } = useChannelSessions();
  const { numerosPermitidos } = useMabe();
  return (sessoes ?? []).filter((s) => numeroPermitido(numerosPermitidos, s.id));
}

/**
 * "Todas as lojas / BASE · Mabe Base / L15 · Manaus Centro / …" — UMA opção por
 * loja (todos os números dela juntos); número sem loja aparece sozinho. Só com 2
 * ou mais opções.
 */
function SeletorDeLoja({ numero, onNumero }: { numero: string | null; onNumero: (v: string | null) => void }) {
  const t = useT();
  const numeros = useNumerosDaPessoa();
  const { lojaDosNumeros } = useMabe();
  const lojas = new Map<string, { nome: string; n: number }>();
  const soltos: typeof numeros = [];
  for (const s of numeros) {
    const l = lojaDosNumeros?.[s.id];
    if (l) lojas.set(l.codigo, { nome: l.nome, n: (lojas.get(l.codigo)?.n ?? 0) + 1 });
    else soltos.push(s);
  }
  if (lojas.size + soltos.length < 2) return null;
  const ordenadas = [...lojas.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  return (
    <div className="px-3 pt-2.5">
      <select
        aria-label={t("Loja")}
        value={numero ?? ""}
        onChange={(e) => onNumero(e.target.value || null)}
        className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
      >
        <option value="">{t("Todas as lojas")}</option>
        {ordenadas.map(([codigo, l]) => (
          <option key={codigo} value={`loja:${codigo}`}>
            {codigo} · {l.nome}
            {l.n > 1 ? ` (${l.n} ${t("números")})` : ""}
          </option>
        ))}
        {soltos.map((s) => (
          <option key={s.id} value={`numero:${s.id}`}>
            {channelLabel(s, t)} ({t("sem loja")})
          </option>
        ))}
      </select>
    </div>
  );
}

/** O "+55 (00) 0000-0000 · Conversar" do VBot: abre a conversa já, sem diálogo. */
function ConversarPeloNumero({ numerosDaSelecao }: { numerosDaSelecao: string[] | null }) {
  const t = useT();
  const podeResponder = usePermission("inbox.reply");
  const { abrir, abrindo } = useAbrirConversa();
  const [numero, setNumero] = useState("");
  const [saidaEscolhida, setSaidaEscolhida] = useState("");
  const todosConectados = useNumerosDaPessoa().filter((s) => s.status === "WORKING");
  if (!podeResponder) return null;

  // Por qual número a mensagem sai: os da loja filtrada (ou todos); com um só, ele;
  // com vários, a pessoa escolhe.
  const conectados = numerosDaSelecao ? todosConectados.filter((s) => numerosDaSelecao.includes(s.id)) : todosConectados;
  const lojaForaDoAr = !!numerosDaSelecao && conectados.length === 0;
  const precisaEscolher = conectados.length > 1;
  const saida =
    conectados.length === 1
      ? (conectados[0]?.id ?? null)
      : conectados.some((s) => s.id === saidaEscolhida)
        ? saidaEscolhida
        : null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const digitos = numero.replace(/\D/g, "");
    if (digitos.length < 10) {
      toast.error(t("Informe o telefone com DDD."));
      return;
    }
    // Quem já digitou com o 55 na frente não ganha um segundo.
    const completo = digitos.startsWith("55") && digitos.length >= 12 ? digitos : `55${digitos}`;
    if (lojaForaDoAr) {
      toast.error(t("O número desta loja está desconectado. Reconecte em Conexões."));
      return;
    }
    if (!saida) {
      toast.error(conectados.length ? t("Escolha por qual loja a conversa sai.") : t("Nenhum número conectado."));
      return;
    }
    if (await abrir({ phone_number: `+${completo}`, channel_session_id: saida })) setNumero("");
  };

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-3">
      {precisaEscolher ? (
        <select
          aria-label={t("Sair pelo número")}
          value={saidaEscolhida}
          onChange={(e) => setSaidaEscolhida(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="">{t("Sair pelo número…")}</option>
          {conectados.map((s) => (
            <option key={s.id} value={s.id}>
              {channelLabel(s, t)}
            </option>
          ))}
        </select>
      ) : null}
      {/* O +55 é prefixo do campo, não uma caixa a mais: uma borda só. */}
      <label className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border px-2 focus-within:ring-2 focus-within:ring-accent">
        <span className="shrink-0 text-sm tabular-nums text-text-muted">+55</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="(92) 99999-9999"
          aria-label={t("Telefone com DDD")}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className="h-full w-full min-w-0 bg-transparent text-sm tabular-nums outline-hidden placeholder:text-text-muted"
        />
      </label>
      <Button type="submit" size="sm" variant="outline" className="h-9 shrink-0" disabled={abrindo}>
        {abrindo ? t("Abrindo…") : t("Conversar")}
      </Button>
    </form>
  );
}
