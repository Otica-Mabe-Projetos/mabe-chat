"use client";
/**
 * Painel do cliente da mesa do atendente — personalização da Ótica Mabe.
 *
 * Só o que ajuda a atender agora: quem é, de onde veio, as etiquetas e as portas
 * para a ficha completa e a agenda. O painel de CRM oficial (com IA, demandas e
 * enriquecimento) continua no Inbox completo.
 */
import Link from "next/link";

import { ConversationTagsEditor } from "@/components/inbox/ConversationTagsEditor";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { ArrowSquareOut, CalendarPlus, IdentificationCard } from "@/lib/ui/icons";
import { CartaoDeOrigem } from "./OrigemDoAnuncio";

export function PainelDoCliente({ conversation }: { conversation: ConversationWithContact | null }) {
  const t = useT();
  const { activeOrg } = useAuth();
  if (!conversation) {
    return (
      <aside className="flex h-full items-center justify-center border-l border-border px-6 text-center text-sm text-text-muted">
        {t("Os dados do cliente aparecem aqui.")}
      </aside>
    );
  }
  const contato = conversation.contacts;
  const nome = contato?.display_name ?? contato?.name ?? t("Sem nome");
  const telefone = contato?.phone_number ? phoneForDisplay(contato.phone_number) : null;
  const numero = conversation.channel_sessions?.display_name ||
    (conversation.channel_sessions?.phone_number ? phoneForDisplay(conversation.channel_sessions.phone_number) : null);
  const agendar = `/app/agenda?contato=${conversation.contact_id}&conversa=${conversation.id}`;

  return (
    <aside className="h-full min-h-0 overflow-y-auto border-l border-border bg-background">
      <section className="border-b border-border px-4 py-4">
        <h2 className="text-base font-semibold text-text">{nome}</h2>
        {telefone && <p className="mt-0.5 text-sm tabular-nums text-text-muted">{telefone}</p>}
        {numero && (
          <p className="mt-2 text-xs text-text-muted">
            {t("Atendido pelo número")} <span className="font-medium text-text">{numero}</span>
          </p>
        )}
      </section>

      <section className="border-b border-border px-4 py-4">
        <h3 className="mb-2 text-sm font-semibold text-text">{t("De onde veio")}</h3>
        <CartaoDeOrigem contactId={conversation.contact_id} />
      </section>

      <section className="border-b border-border px-4 py-4">
        <h3 className="mb-2 text-sm font-semibold text-text">{t("Etiquetas")}</h3>
        {activeOrg?.orgId && (
          <ConversationTagsEditor
            conversationId={conversation.id}
            orgId={activeOrg.orgId}
            tags={conversation.tags ?? []}
          />
        )}
      </section>

      <section className="space-y-1 px-2 py-3">
        <Link
          href={agendar}
          target="_blank"
          className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm text-text hover:bg-surface-elevated"
        >
          <CalendarPlus size={16} className="text-accent" aria-hidden />
          <span className="flex-1">{t("Agendar exame")}</span>
          <ArrowSquareOut size={12} className="text-text-muted" aria-hidden />
        </Link>
        <Link
          href={`/app/contacts/${conversation.contact_id}`}
          target="_blank"
          className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm text-text hover:bg-surface-elevated"
        >
          <IdentificationCard size={16} className="text-text-muted" aria-hidden />
          <span className="flex-1">{t("Ficha completa do cliente")}</span>
          <ArrowSquareOut size={12} className="text-text-muted" aria-hidden />
        </Link>
      </section>
    </aside>
  );
}
