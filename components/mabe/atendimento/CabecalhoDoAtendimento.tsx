"use client";
/**
 * Cabeçalho da conversa na mesa do atendente — personalização da Ótica Mabe.
 *
 * Quem é, em que pé está e — quando é a minha conversa — as ações do atendimento
 * (Lembrar, Transferir, Concluir), numa linha só, como no VBot: o compositor fica
 * livre. Em coluna estreita as ações secundárias viram ícone (container query no
 * próprio cabeçalho, que mede a coluna e não a janela). O cabeçalho oficial
 * continua intacto no Inbox completo.
 */
import { rotuloDoContato } from "@/lib/contacts/rotulo-do-contato";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useSnoozeConversation } from "@/hooks/inbox/useSnoozeConversation";
import { formatarDecorrido } from "@/lib/channels/janela";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import {
  ArrowRight,
  CaretLeft,
  ChatCircle,
  CheckCircle,
  Clock,
  Eye,
  IdentificationCard,
} from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
import { esperaDesde, useAgora } from "./espera";

const ENCERRADOS = new Set(["closed", "archived", "resolved"]);

interface Props {
  conversa: ConversationWithContact;
  eMinha: boolean;
  onVoltar: () => void;
  onAbrirPainel: () => void;
  /** Presentes só quando as ações do atendimento valem (conversa minha, aberta, com escrita). */
  onTransferir?: () => void;
  onConcluir?: () => void;
}

/** Iniciais só de letras: "Paulo Lobato (Suporte)" vira "PS", nunca "P(". */
function iniciais(nome: string): string {
  const letras = nome
    .split(/\s+/)
    .map((p) => p.match(/\p{L}/u)?.[0])
    .filter((l): l is string => !!l);
  return ((letras[0] ?? "") + (letras.length > 1 ? letras[letras.length - 1] : "")).toUpperCase() || "?";
}

export function CabecalhoDoAtendimento({
  conversa,
  eMinha,
  onVoltar,
  onAbrirPainel,
  onTransferir,
  onConcluir,
}: Props) {
  const t = useT();
  // O tique de 30s redesenha só o cabeçalho (espera e Lembrar), não a conversa.
  const agora = useAgora();
  const c = conversa.contacts;
  const telefone = c?.phone_number ? phoneForDisplay(c.phone_number) : null;
  const nome = rotuloDoContato(c, t);
  const numero =
    conversa.channel_sessions?.display_name ||
    (conversa.channel_sessions?.phone_number ? phoneForDisplay(conversa.channel_sessions.phone_number) : null);
  const encerrada = ENCERRADOS.has(conversa.status);

  // Um indicador só. Cliente esperando resposta é o que pede ação, então ele
  // ganha a pílula (âmbar a partir de 5 min, vermelho a partir de 15); senão, o
  // estado do atendimento.
  const desde = encerrada ? null : esperaDesde(conversa);
  const esperaMs = desde ? Math.max(0, agora.getTime() - new Date(desde).getTime()) : null;
  const indicador =
    esperaMs !== null
      ? {
          texto: `${t("Esperando há")} ${formatarDecorrido(esperaMs)}`,
          icone: Clock,
          tom: esperaMs >= 15 * 60_000 ? "erro" : esperaMs >= 5 * 60_000 ? "aviso" : "neutro",
          titulo: t("Tempo desde a última mensagem do cliente sem resposta"),
        }
      : encerrada
        ? { texto: t("Concluído"), icone: CheckCircle, tom: "neutro", titulo: undefined }
        : conversa.assigned_to_user_id === null
          ? { texto: t("Novo"), icone: Clock, tom: "acento", titulo: undefined }
          : eMinha
            ? { texto: t("Em atendimento"), icone: ChatCircle, tom: "sucesso", titulo: undefined }
            : {
                texto: `${t("Com")} ${conversa.assigned_to_user_name?.split(" ")[0] ?? t("colega")}`,
                icone: Eye,
                tom: "neutro",
                titulo: undefined,
              };
  const Icone = indicador.icone;
  const detalhe = [telefone !== nome ? telefone : null, numero ? `${t("pelo número")} ${numero}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="@container border-b border-border bg-background">
      <div className="flex items-center gap-3 px-3 py-2.5 md:px-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 shrink-0 px-0 md:hidden"
          onClick={onVoltar}
          aria-label={t("Voltar para a lista")}
        >
          <CaretLeft size={18} aria-hidden />
        </Button>
        <Avatar className="h-10 w-10 shrink-0">
          {c?.avatar_storage_path && !c?.is_anonymized ? (
            <AvatarImage src={`/api/v1/contacts/${c.id}/avatar`} alt="" className="object-cover" />
          ) : null}
          <AvatarFallback className="bg-surface-elevated text-xs font-medium text-text-muted">
            {iniciais(nome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold leading-tight text-text" title={nome}>
            {nome}
          </h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5 font-medium tabular-nums",
                indicador.tom === "erro" && "bg-error-bg text-error-fg",
                indicador.tom === "aviso" && "bg-warning-bg text-warning-fg",
                indicador.tom === "acento" && "bg-accent-soft text-text",
                indicador.tom === "sucesso" && "bg-success-bg text-success-fg",
                indicador.tom === "neutro" && "bg-surface-elevated text-text-muted",
              )}
              title={indicador.titulo}
            >
              <Icone size={12} weight="bold" className="shrink-0" aria-hidden />
              <span className="truncate">{indicador.texto}</span>
            </span>
            {detalhe && (
              <span className="min-w-0 truncate tabular-nums text-text-muted" title={detalhe}>
                {detalhe}
              </span>
            )}
          </div>
        </div>

        {(onTransferir || onConcluir) && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Lembrar conversationId={conversa.id} snoozeUntil={conversa.snooze_until ?? null} agora={agora} />
            {onTransferir && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-w-9 gap-1.5 px-2.5"
                onClick={onTransferir}
                aria-label={t("Transferir")}
                title={t("Transferir")}
              >
                <ArrowRight size={16} aria-hidden />
                <span className="hidden @2xl:inline">{t("Transferir")}</span>
              </Button>
            )}
            {onConcluir && (
              <Button
                size="sm"
                className="h-9 min-w-9 gap-1.5 px-2.5 @lg:px-3.5"
                onClick={onConcluir}
                aria-label={t("Concluir")}
                title={t("Concluir")}
              >
                <CheckCircle size={16} aria-hidden />
                <span className="hidden @lg:inline">{t("Concluir")}</span>
              </Button>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-9 min-w-9 shrink-0 gap-1.5 px-2.5 xl:hidden"
          onClick={onAbrirPainel}
          aria-label={t("Cliente")}
          title={t("Cliente")}
        >
          <IdentificationCard size={16} aria-hidden />
          <span className="hidden @2xl:inline">{t("Cliente")}</span>
        </Button>
      </div>
    </header>
  );
}

const DURACOES: Array<{ hours: 1 | 3 | 24; label: string }> = [
  { hours: 1, label: "Em 1 hora" },
  { hours: 3, label: "Em 3 horas" },
  { hours: 24, label: "Em 24 horas" },
];

/**
 * O "Lembrar" do `SnoozeButton` oficial, mesmo hook e mesmas durações, só que
 * encolhível para ícone: o oficial não tem prop para isso e não se edita.
 */
function Lembrar({
  conversationId,
  snoozeUntil,
  agora,
}: {
  conversationId: string;
  snoozeUntil: string | null;
  agora: Date;
}) {
  const t = useT();
  const { snooze, cancel } = useSnoozeConversation();
  const ativo = snoozeUntil != null && new Date(snoozeUntil).getTime() > agora.getTime();
  const rotulo = ativo ? t("Lembrete ativo") : t("Lembrar");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 min-w-9 gap-1.5 px-2.5", ativo && "border-accent text-text")}
          disabled={snooze.isPending || cancel.isPending}
          aria-label={rotulo}
          title={rotulo}
        >
          <Clock size={16} weight={ativo ? "fill" : "regular"} aria-hidden />
          <span className="hidden @2xl:inline">{rotulo}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ativo ? (
          <DropdownMenuItem onClick={() => cancel.mutate({ conversation_id: conversationId })}>
            {t("Cancelar lembrete")}
          </DropdownMenuItem>
        ) : (
          DURACOES.map((d) => (
            <DropdownMenuItem
              key={d.hours}
              onClick={() => snooze.mutate({ conversation_id: conversationId, duration_hours: d.hours })}
            >
              {t(d.label)}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
