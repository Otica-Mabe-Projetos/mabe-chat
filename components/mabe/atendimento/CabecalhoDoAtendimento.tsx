"use client";
/**
 * Cabeçalho da conversa na mesa do atendente — personalização da Ótica Mabe.
 *
 * Quem é, por qual número, em que pé está e há quanto tempo espera. As ações não
 * moram aqui: ficam embaixo, junto de onde se escreve (ver `Atendimento.tsx`). O
 * cabeçalho oficial continua intacto no Inbox completo.
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { formatarDecorrido } from "@/lib/channels/janela";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { CaretLeft, ChatCircle, CheckCircle, Clock, Eye, IdentificationCard } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

const ENCERRADOS = new Set(["closed", "archived", "resolved"]);

interface Props {
  conversa: ConversationWithContact;
  eMinha: boolean;
  agora: Date;
  onVoltar: () => void;
  onAbrirPainel: () => void;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1]![0] : "")).toUpperCase() || "?";
}

export function CabecalhoDoAtendimento({ conversa, eMinha, agora, onVoltar, onAbrirPainel }: Props) {
  const t = useT();
  const c = conversa.contacts;
  const telefone = c?.phone_number ? phoneForDisplay(c.phone_number) : null;
  const nome = c?.display_name ?? c?.name ?? telefone ?? t("Sem nome");
  const numero = conversa.channel_sessions?.display_name ||
    (conversa.channel_sessions?.phone_number ? phoneForDisplay(conversa.channel_sessions.phone_number) : null);
  const encerrada = ENCERRADOS.has(conversa.status);

  const status = encerrada
    ? { texto: t("Concluído"), icone: CheckCircle, tom: "neutro" as const }
    : conversa.assigned_to_user_id === null
      ? { texto: t("Novo"), icone: Clock, tom: "acento" as const }
      : eMinha
        ? { texto: t("Em atendimento"), icone: ChatCircle, tom: "sucesso" as const }
        : {
            texto: `${t("Com")} ${conversa.assigned_to_user_name?.split(" ")[0] ?? t("colega")}`,
            icone: Eye,
            tom: "neutro" as const,
          };
  const Icone = status.icone;

  // Espera = desde a última mensagem do cliente sem resposta. Cores só reforçam o
  // texto: âmbar a partir de 5 min, vermelho a partir de 15 min.
  const esperaMs =
    !encerrada && conversa.awaiting_since ? agora.getTime() - new Date(conversa.awaiting_since).getTime() : null;
  const tomDaEspera =
    esperaMs === null ? null : esperaMs >= 15 * 60_000 ? "erro" : esperaMs >= 5 * 60_000 ? "aviso" : "neutro";

  return (
    <header className="flex items-center gap-3 border-b border-border bg-background px-3 py-2.5 md:px-4">
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
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 truncate text-base font-semibold text-text" title={nome}>
            {nome}
          </h2>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              status.tom === "acento" && "bg-accent-soft text-text",
              status.tom === "sucesso" && "bg-success-bg text-success-fg",
              status.tom === "neutro" && "bg-surface-elevated text-text-muted",
            )}
          >
            <Icone size={12} weight="bold" aria-hidden />
            {status.texto}
          </span>
        </div>
        <p className="truncate text-xs tabular-nums text-text-muted">
          {[telefone, numero ? `${t("pelo número")} ${numero}` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
      {esperaMs !== null && tomDaEspera && (
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium tabular-nums sm:inline-flex",
            tomDaEspera === "erro" && "bg-error-bg text-error-fg",
            tomDaEspera === "aviso" && "bg-warning-bg text-warning-fg",
            tomDaEspera === "neutro" && "bg-surface-elevated text-text-muted",
          )}
          title={t("Tempo desde a última mensagem do cliente sem resposta")}
        >
          <Clock size={12} weight="bold" aria-hidden />
          {t("Esperando há")} {formatarDecorrido(Math.max(0, esperaMs))}
        </span>
      )}
      <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 xl:hidden" onClick={onAbrirPainel}>
        <IdentificationCard size={16} aria-hidden />
        <span className="hidden sm:inline">{t("Cliente")}</span>
      </Button>
    </header>
  );
}
