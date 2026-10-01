"use client";
/**
 * Aviso de carregamento das telas que leem o ERP (personalização Ótica Mabe).
 * Fica por cima do esqueleto: diz o que está acontecendo e, se passar de 6 s,
 * avisa que a base está demorando — para ninguém achar que travou.
 */
import { useEffect, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { CircleNotch } from "@/lib/ui/icons";

export function CarregandoBase({ texto }: { texto: string }) {
  const t = useT();
  const [demorando, setDemorando] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDemorando(true), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
      <CircleNotch size={18} className="shrink-0 animate-spin text-accent" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{t(texto)}</p>
        <p className="text-xs text-text-muted">
          {demorando ? t("A base da ótica está demorando mais que o normal. Pode aguardar, já está chegando.") : t("Lendo a base de clientes da ótica…")}
        </p>
      </div>
    </div>
  );
}
