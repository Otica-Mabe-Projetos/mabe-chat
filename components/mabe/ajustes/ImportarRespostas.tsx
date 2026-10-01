"use client";
/**
 * Botão "Importar respostas rápidas da Mabe" (personalização Ótica Mabe).
 * Só cria as que faltam, como compartilhadas, pela API oficial; nunca altera
 * nem apaga template existente — clicar de novo não duplica.
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import type { MessageTemplate } from "@/hooks/inbox/useMessageTemplates";
import { apiClient } from "@/lib/api/client";

import { quaisFaltam, type RespostaDaMabe } from "./respostas-da-mabe";

const ROTA = "/api/v1/message-templates";

export function ImportarRespostas() {
  const t = useT();
  const qc = useQueryClient();
  const [ocupado, setOcupado] = useState(false);
  const [faltam, setFaltam] = useState<RespostaDaMabe[] | null>(null);

  const verificar = async () => {
    setOcupado(true);
    try {
      const { data } = await apiClient.get<{ data: MessageTemplate[] }>(ROTA);
      const lista = quaisFaltam(data);
      if (lista.length === 0) toast.success(t("Todas as respostas da Mabe já estão cadastradas."));
      else setFaltam(lista);
    } catch (err) {
      showApiError(err);
    } finally {
      setOcupado(false);
    }
  };

  const importar = async () => {
    const lista = faltam ?? [];
    setFaltam(null);
    setOcupado(true);
    let criadas = 0;
    // Sequencial de propósito: poucas chamadas, e uma falha não derruba as outras.
    for (const r of lista) {
      try {
        await apiClient.post(ROTA, { ...r, shared: true });
        criadas++;
      } catch {
        /* conta como falha abaixo */
      }
    }
    setOcupado(false);
    void qc.invalidateQueries({ queryKey: ["message-templates"] });
    const falharam = lista.length - criadas;
    if (falharam === 0) toast.success(t("{n} respostas rápidas adicionadas.").replace("{n}", String(criadas)));
    else
      toast.error(
        t("{c} respostas adicionadas, {f} falharam. Tente de novo para completar.")
          .replace("{c}", String(criadas))
          .replace("{f}", String(falharam)),
      );
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" disabled={ocupado} onClick={verificar}>
        {t("Importar respostas rápidas da Mabe")}
      </Button>
      <AlertDialog open={faltam !== null} onOpenChange={(aberto) => !aberto && setFaltam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Importar respostas rápidas")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "Adicionar {n} respostas rápidas compartilhadas da Mabe? As que já existem não são alteradas.",
              ).replace("{n}", String(faltam?.length ?? 0))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={importar}>{t("Adicionar")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
