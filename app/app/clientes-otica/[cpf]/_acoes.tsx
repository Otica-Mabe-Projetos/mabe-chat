"use client";
/**
 * Ficha do cliente da ótica — as partes que clicam (personalização Ótica Mabe).
 *
 * "Conversar" usa o mesmo caminho do "Nova conversa" do Inbox (`useAbrirConversa`
 * → POST /api/v1/conversations/open-with-contact): se o número ainda não é
 * contato, vira contato, e a conversa abre no Inbox. Os números de saída são os
 * que a pessoa enxerga pela restrição por loja (`permitidos`, calculado no servidor).
 */
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { useAbrirConversa } from "@/components/inbox/NovaConversa";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { ArrowsClockwise, CaretLeft, ChatCircle, CircleNotch, WhatsappLogo } from "@/lib/ui/icons";

export function Voltar() {
  const t = useT();
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/app/clientes-otica"))}
      className="inline-flex items-center gap-1 rounded-md text-sm text-text-muted hover:text-text"
    >
      <CaretLeft size={14} aria-hidden />
      {t("Clientes da ótica")}
    </button>
  );
}

export function TentarDeNovo() {
  const t = useT();
  const router = useRouter();
  const [tentando, iniciar] = useTransition();
  return (
    <Button type="button" variant="outline" size="sm" disabled={tentando} onClick={() => iniciar(() => router.refresh())}>
      {tentando ? <CircleNotch size={14} className="animate-spin" aria-hidden /> : <ArrowsClockwise size={14} aria-hidden />}
      {tentando ? t("Carregando…") : t("Tentar de novo")}
    </Button>
  );
}

/** `compacto`: só o ícone, para a linha da lista (não deixa o clique abrir a ficha). */
export function Conversar({
  telefone,
  nome,
  permitidos,
  compacto,
}: {
  telefone: string;
  nome?: string;
  permitidos: string[] | null;
  compacto?: boolean;
}) {
  const t = useT();
  const podeResponder = usePermission("inbox.reply");
  const { data: sessoes } = useChannelSessions();
  const { abrir, abrindo } = useAbrirConversa();
  if (!podeResponder) return null;

  const conectados = (sessoes ?? []).filter((s) => s.status === "WORKING" && (!permitidos || permitidos.includes(s.id)));
  const corpo = (channel_session_id?: string) => ({ phone_number: telefone, name: nome || undefined, channel_session_id });

  const botao = (onClick?: () => void) =>
    compacto ? (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="size-8 shrink-0 p-0 text-success-fg hover:border-accent"
        disabled={abrindo || !sessoes}
        onClick={onClick}
        aria-label={`${t("Enviar mensagem para")} ${nome || telefone}`}
        title={t("Enviar mensagem no WhatsApp")}
      >
        {abrindo ? <CircleNotch size={15} className="animate-spin" aria-hidden /> : <WhatsappLogo size={16} aria-hidden />}
      </Button>
    ) : (
      <Button type="button" size="sm" variant="outline" className="h-8 px-2.5" disabled={abrindo || !sessoes} onClick={onClick}>
        {abrindo ? <CircleNotch size={14} className="animate-spin" aria-hidden /> : <ChatCircle size={14} aria-hidden />}
        {abrindo ? t("Abrindo…") : t("Enviar mensagem")}
      </Button>
    );
  // Na lista a linha inteira abre a ficha; o clique aqui (e no menu, que vem por portal) para aqui.
  const isolar = (n: ReactNode) => (compacto ? <span className="inline-flex" onClick={(e) => e.stopPropagation()}>{n}</span> : n);

  if (conectados.length <= 1) {
    return isolar(botao(() => {
      if (!conectados[0]) {
        toast.error(t("Nenhum WhatsApp conectado agora. Conecte um número em Conexões para a mensagem sair."));
        return;
      }
      void abrir(corpo(conectados[0].id));
    }));
  }
  return isolar(
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{botao()}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {conectados.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => void abrir(corpo(s.id))}>
            {t("Sair por")} {channelLabel(s, t)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}
