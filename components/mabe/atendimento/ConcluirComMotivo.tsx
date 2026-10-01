"use client";
/**
 * Concluir atendimento com motivo — personalização da Ótica Mabe.
 *
 * O produto fecha a conversa sem motivo (`POST /close` só aceita a revisão). Aqui o
 * motivo vira etiqueta `motivo: …` da conversa (filtrável) e uma nota interna com o
 * que foi escolhido; só depois a conversa é fechada pelo caminho oficial.
 */
import { useEffect, useRef, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";
import { useCloseConversation } from "@/hooks/inbox/useCloseConversation";
import { useUpdateConversationTags } from "@/hooks/inbox/useConversationTags";
import { useCreateNote } from "@/hooks/inbox/useCreateNote";
import { cn } from "@/lib/utils";
import { useMabe } from "@/components/mabe/ajustes/ProvedorMabe";
import { etiquetasComMotivo } from "./motivos";

interface Props {
  conversationId: string;
  etiquetas: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ConcluirComMotivo({ conversationId, etiquetas, open, onOpenChange }: Props) {
  const t = useT();
  const { motivos } = useMabe();
  const [motivo, setMotivo] = useState<string | null>(null);
  const [observacao, setObservacao] = useState("");
  const nota = useCreateNote();
  const tags = useUpdateConversationTags();
  const fechar = useCloseConversation();
  const enviando = nota.isPending || tags.isPending || fechar.isPending;
  // Se etiquetas ou fechar falham, o novo clique não pode criar uma segunda nota.
  const notaFeita = useRef(false);
  useEffect(() => {
    notaFeita.current = false;
  }, [conversationId]);

  const mudarAberto = (v: boolean) => {
    if (!v) notaFeita.current = false;
    onOpenChange(v);
  };

  const concluir = async () => {
    if (!motivo) return;
    try {
      const obs = observacao.trim();
      if (!notaFeita.current) {
        await nota.mutateAsync({
          conversation_id: conversationId,
          body: `${t("Atendimento concluído")} — ${t("motivo")}: ${t(motivo)}${obs ? `\n${obs}` : ""}`,
        });
        notaFeita.current = true;
      }
      await tags.mutateAsync({
        conversation_id: conversationId,
        tags: etiquetasComMotivo(etiquetas, motivo),
      });
      await fechar.mutateAsync({ conversation_id: conversationId });
      toast.success(t("Atendimento concluído."));
      mudarAberto(false);
      setMotivo(null);
      setObservacao("");
    } catch {
      // Cada hook já mostrou o erro técnico; aqui o resumo quando a nota já saiu.
      if (notaFeita.current) {
        toast.error(t("Motivo salvo, mas a conversa não foi concluída. Tente de novo."));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={mudarAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Concluir atendimento")}</DialogTitle>
          <DialogDescription>{t("Como terminou este atendimento?")}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t("Motivo")} className="grid grid-cols-2 gap-2">
          {motivos.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={motivo === m}
              onClick={() => setMotivo(m)}
              className={cn(
                "min-h-10 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                motivo === m
                  ? "border-accent bg-accent-soft font-medium text-text"
                  : "border-border hover:bg-surface-elevated",
              )}
            >
              {t(m)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="concluir-observacao">{t("Observação (opcional)")}</Label>
          <Textarea
            id="concluir-observacao"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => mudarAberto(false)}>
            {t("Cancelar")}
          </Button>
          <Button type="button" disabled={!motivo || enviando} onClick={() => void concluir()}>
            {enviando ? t("Concluindo…") : t("Concluir")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
