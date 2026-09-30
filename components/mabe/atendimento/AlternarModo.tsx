"use client";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { useMabe } from "@/components/mabe/ajustes/ProvedorMabe";
import { ArrowsOutSimple } from "@/lib/ui/icons";
import { COOKIE_DO_MODO, type ModoDoInbox } from "./modo";

/**
 * Troca entre a mesa do atendente e o Inbox completo (vale para esta pessoa, neste navegador).
 * `compacto`: só o ícone, com o nome no tooltip e no leitor de tela — para não
 * disputar espaço nem atenção com as abas da mesa.
 */
export function AlternarModo({ para, compacto = false }: { para: ModoDoInbox; compacto?: boolean }) {
  const t = useT();
  const router = useRouter();
  // Some quando Configurações › Visual Mabe não deixa esta pessoa trocar.
  const { podeTrocarModo } = useMabe();
  if (!podeTrocarModo) return null;
  const rotulo = para === "atendente" ? t("Modo atendente") : t("Modo completo");
  const trocar = () => {
    document.cookie = `${COOKIE_DO_MODO}=${para}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
  if (compacto) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 text-text-muted hover:text-text lg:h-8 lg:w-8"
        aria-label={rotulo}
        title={rotulo}
        onClick={trocar}
      >
        <ArrowsOutSimple size={16} aria-hidden />
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs text-text-muted" onClick={trocar}>
      {rotulo}
    </Button>
  );
}
