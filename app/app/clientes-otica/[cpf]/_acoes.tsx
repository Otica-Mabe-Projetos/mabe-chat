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
import { toast } from "sonner";

import { useAbrirConversa } from "@/components/inbox/NovaConversa";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { ArrowsClockwise, CaretLeft, ChatCircle } from "@/lib/ui/icons";

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
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => router.refresh()}>
      <ArrowsClockwise size={14} aria-hidden />
      {t("Tentar de novo")}
    </Button>
  );
}

export function Conversar({ telefone, nome, permitidos }: { telefone: string; nome?: string; permitidos: string[] | null }) {
  const t = useT();
  const podeResponder = usePermission("inbox.reply");
  const { data: sessoes } = useChannelSessions();
  const { abrir, abrindo } = useAbrirConversa();
  if (!podeResponder) return null;

  const conectados = (sessoes ?? []).filter((s) => s.status === "WORKING" && (!permitidos || permitidos.includes(s.id)));
  const corpo = (channel_session_id?: string) => ({ phone_number: telefone, name: nome || undefined, channel_session_id });

  const botao = (onClick?: () => void) => (
    <Button type="button" size="sm" variant="outline" className="h-8 px-2.5" disabled={abrindo || !sessoes} onClick={onClick}>
      <ChatCircle size={14} aria-hidden />
      {abrindo ? t("Abrindo…") : t("Conversar")}
    </Button>
  );

  if (conectados.length <= 1) {
    return botao(() => {
      if (!conectados[0]) {
        toast.error(t("Nenhum WhatsApp conectado agora. Conecte um número em Conexões para a mensagem sair."));
        return;
      }
      void abrir(corpo(conectados[0].id));
    });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{botao()}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {conectados.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => void abrir(corpo(s.id))}>
            {t("Sair por")} {channelLabel(s, t)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
