"use client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { useVisualMabe } from "@/components/mabe/visual/AlternarVisualMabe";
import { gravarCookie } from "@/components/mabe/visual/visual";
import { COOKIE_DO_MODO, type ModoDoInbox } from "./modo";

/** Troca entre a mesa do atendente e o Inbox completo (vale para esta pessoa, neste navegador). */
export function AlternarModo({ para }: { para: ModoDoInbox }) {
  const t = useT();
  const router = useRouter();
  // Com o "Visual Mabe" desligado não existe mesa do atendente para onde ir.
  const visualLigado = useVisualMabe();
  if (!visualLigado) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 shrink-0 px-2 text-xs text-text-muted"
      onClick={() => {
        gravarCookie(COOKIE_DO_MODO, para);
        router.refresh();
      }}
    >
      {para === "atendente" ? t("Modo atendente") : t("Modo completo")}
    </Button>
  );
}
