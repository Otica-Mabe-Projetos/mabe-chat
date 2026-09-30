"use client";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import { Switch } from "@/components/ui/switch";
import { useT } from "@/hooks/i18n/useT";
import { COOKIE_DO_VISUAL, gravarCookie, lerCookie, visualMabeLigado } from "./visual";

const nadaAssinar = () => () => {};

/** Estado do mod no navegador; no servidor vale o padrão (ligado). */
export function useVisualMabe(): boolean {
  return useSyncExternalStore(
    nadaAssinar,
    () => visualMabeLigado(lerCookie(COOKIE_DO_VISUAL)),
    () => true,
  );
}

/** Interruptor "Visual Mabe" da barra do topo: liga as cores e a mesa da Mabe, ou volta ao padrão. */
export function AlternarVisualMabe() {
  const t = useT();
  const router = useRouter();
  const doCookie = useVisualMabe();
  // O cookie não avisa ninguém quando muda: o estado local responde ao clique na hora.
  const [escolha, setEscolha] = useState<boolean | null>(null);
  const ligado = escolha ?? doCookie;
  return (
    <label className="hidden cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs text-text-muted hover:bg-surface-elevated sm:flex">
      <span>{t("Visual Mabe")}</span>
      <Switch
        checked={ligado}
        aria-label={t("Visual Mabe")}
        onCheckedChange={(v) => {
          setEscolha(v);
          gravarCookie(COOKIE_DO_VISUAL, v ? "mabe" : "padrao");
          router.refresh();
        }}
      />
    </label>
  );
}
