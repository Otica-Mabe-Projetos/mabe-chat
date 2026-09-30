"use client";
/**
 * Painel do cliente da mesa do atendente — personalização da Ótica Mabe.
 *
 * Só o que ajuda a atender agora: quem é, de onde veio (quando se sabe), as etiquetas e as portas
 * para a ficha completa e a agenda. O painel de CRM oficial (com IA, demandas e
 * enriquecimento) continua no Inbox completo.
 */
import Link from "next/link";
import { useState } from "react";

import { ConversationTagsEditor } from "@/components/inbox/ConversationTagsEditor";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { phoneForDisplay } from "@/lib/channels/phone-variants";
import { ArrowSquareOut, CalendarPlus, IdentificationCard, Plus } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";
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
    <aside className="h-full min-h-0 space-y-6 overflow-y-auto border-l border-border bg-background px-4 py-5">
      <header>
        <h2 className="text-base font-medium text-text">{nome}</h2>
        {telefone && <p className="mt-1 text-sm tabular-nums text-text-muted">{telefone}</p>}
        {numero && (
          <p className="mt-3 text-xs text-text-muted">
            {t("Atendido pelo número")}{" "}
            <span className="tabular-nums text-text-muted">{numero}</span>
          </p>
        )}
      </header>

      <CartaoDeOrigem contactId={conversation.contact_id} />

      {activeOrg?.orgId && (
        <EtiquetasDaConversa
          conversationId={conversation.id}
          orgId={activeOrg.orgId}
          tags={conversation.tags ?? []}
        />
      )}

      <nav className="-mx-2 space-y-1 border-t border-border pt-4">
        <AcaoDoPainel href={agendar} icone={CalendarPlus} rotulo={t("Agendar exame")} />
        <AcaoDoPainel
          href={`/app/contacts/${conversation.contact_id}`}
          icone={IdentificationCard}
          rotulo={t("Ficha completa do cliente")}
        />
      </nav>
    </aside>
  );
}

function AcaoDoPainel({ href, icone: Icone, rotulo }: { href: string; icone: typeof CalendarPlus; rotulo: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="flex min-h-10 items-center gap-3 rounded-md px-2 text-sm text-text hover:bg-surface-elevated"
    >
      <Icone size={16} className="shrink-0 text-text-muted" aria-hidden />
      <span className="flex-1">{rotulo}</span>
      <ArrowSquareOut size={12} className="shrink-0 text-text-subtle" aria-hidden />
    </Link>
  );
}

/**
 * Etiquetas: um título só, as aplicadas sempre à vista, e o campo + sugestões
 * atrás de "adicionar". O editor é upstream e não tem prop para isso, então o
 * título dele e as linhas de edição somem por CSS escopado a este wrapper
 * (estrutura: section > h3, div[aplicadas], div[campo], div[sugestões]?).
 */
function EtiquetasDaConversa(props: { conversationId: string; orgId: string; tags: string[] }) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-text-muted">{t("Etiquetas")}</h3>
        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          aria-expanded={editando}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-text-muted hover:bg-surface-elevated hover:text-text"
        >
          {editando ? (
            t("Fechar")
          ) : (
            <>
              <Plus size={12} aria-hidden />
              {t("Adicionar etiqueta")}
            </>
          )}
        </button>
      </div>
      <div
        className={cn(
          "[&>section>h3]:hidden [&>section>div:first-of-type]:mt-0",
          !editando && "[&>section>div:not(:first-of-type)]:hidden",
          !editando && props.tags.length === 0 && "hidden",
        )}
      >
        <ConversationTagsEditor {...props} />
      </div>
    </section>
  );
}
