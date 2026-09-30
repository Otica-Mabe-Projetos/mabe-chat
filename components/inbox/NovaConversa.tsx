"use client";
/**
 * Iniciar conversa — personalização da Ótica Mabe, fora do upstream.
 *
 * O produto só abria conversa nova por um ícone na lista de Contatos. Aqui a mesma
 * rota (`POST /api/v1/conversations/open-with-contact`, que cria o contato pelo
 * telefone quando ele não existe) ganha duas portas: "Nova conversa" no topo do
 * Inbox, pelo número, e "Iniciar conversa" na ficha do negócio que ainda não tem
 * conversa. A primeira mensagem é escrita no composer, como sempre.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { ArrowRight, ChatCircle } from "@/lib/ui/icons";
import { AlternarModo } from "@/components/mabe/atendimento/AlternarModo";

type Abertura = {
  contact_id?: string;
  phone_number?: string;
  name?: string;
  channel_session_id?: string;
};

export function useAbrirConversa() {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [abrindo, setAbrindo] = useState(false);

  async function abrir(corpo: Abertura): Promise<boolean> {
    setAbrindo(true);
    try {
      const res = await fetch("/api/v1/conversations/open-with-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: { conversation_id: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.conversation_id) {
        throw new Error(json.error?.message ?? "Não foi possível abrir a conversa.");
      }
      // A conversa nova aparece na lista de Contatos e no card do funil.
      await Promise.all(
        ["contacts", "leads", "board"].map((k) => qc.invalidateQueries({ queryKey: [k] })),
      );
      router.push(`/app/inbox?id=${json.data.conversation_id}`);
      return true;
    } catch (err) {
      toast.error(t(err instanceof Error ? err.message : "Não foi possível abrir a conversa."));
      return false;
    } finally {
      setAbrindo(false);
    }
  }

  return { abrir, abrindo };
}

/** Barra com "Nova conversa", no topo da lista do Inbox. Some para quem só lê. */
export function NovaConversaBarra() {
  const t = useT();
  const podeResponder = usePermission("inbox.reply");
  const { data: sessoes } = useChannelSessions();
  const { abrir, abrindo } = useAbrirConversa();
  const [aberto, setAberto] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [numero, setNumero] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  if (!podeResponder) return null;

  const conectados = (sessoes ?? []).filter((s) => s.status === "WORKING");
  const numeroEscolhido = numero || conectados[0]?.id || "";

  const fechar = () => {
    setAberto(false);
    setTelefone("");
    setNome("");
    setErro(null);
  };

  const iniciar = async (e: FormEvent) => {
    e.preventDefault();
    if (telefone.replace(/\D/g, "").length < 10) {
      setErro(t("Informe o telefone com DDD."));
      return;
    }
    setErro(null);
    const ok = await abrir({
      phone_number: telefone.trim(),
      name: nome.trim() || undefined,
      channel_session_id: numeroEscolhido || undefined,
    });
    if (ok) fechar();
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
      <AlternarModo para="atendente" />
      <Button size="sm" onClick={() => setAberto(true)}>
        <ChatCircle size={16} weight="regular" aria-hidden />
        {t("Nova conversa")}
      </Button>
      <Dialog open={aberto} onOpenChange={(o) => (o ? setAberto(true) : fechar())}>
        <DialogContent>
          <form onSubmit={iniciar} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t("Nova conversa")}</DialogTitle>
              <DialogDescription>
                {t(
                  "Abre a conversa com esse número. Se ele ainda não é contato, vira contato agora. A primeira mensagem você escreve na conversa.",
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="nova-conversa-telefone">{t("Telefone (com DDD)")}</Label>
              <Input
                id="nova-conversa-telefone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="(92) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nova-conversa-nome">{t("Nome (opcional)")}</Label>
              <Input
                id="nova-conversa-nome"
                autoComplete="off"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            {conectados.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="nova-conversa-numero">{t("Enviar pelo número")}</Label>
                <Select value={numeroEscolhido} onValueChange={setNumero}>
                  <SelectTrigger id="nova-conversa-numero">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conectados.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {channelLabel(s, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {sessoes && conectados.length === 0 ? (
              <p role="status" className="text-sm text-warning-fg">
                {t("Nenhum WhatsApp conectado agora. Conecte um número em Conexões para a mensagem sair.")}
              </p>
            ) : null}
            {erro ? (
              <p role="alert" className="text-sm text-destructive">
                {erro}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={fechar}>
                {t("Cancelar")}
              </Button>
              <Button type="submit" disabled={abrindo}>
                {abrindo ? t("Abrindo…") : t("Abrir conversa")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** "Iniciar conversa" na ficha do negócio cujo contato tem telefone e ainda não tem conversa. */
export function IniciarConversaNoDossie({ contactId }: { contactId: string }) {
  const t = useT();
  const podeResponder = usePermission("inbox.reply");
  const { abrir, abrindo } = useAbrirConversa();
  if (!podeResponder) return null;

  return (
    <button
      type="button"
      disabled={abrindo}
      onClick={() => void abrir({ contact_id: contactId })}
      className="group mt-3 flex w-full items-center gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-60"
    >
      <ChatCircle size={16} weight="regular" className="shrink-0 text-text-muted" aria-hidden />
      <span className="min-w-0 flex-1 text-xs font-medium text-text">
        {abrindo ? t("Abrindo…") : t("Iniciar conversa no Inbox")}
      </span>
      <ArrowRight
        size={14}
        weight="regular"
        className="shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}
