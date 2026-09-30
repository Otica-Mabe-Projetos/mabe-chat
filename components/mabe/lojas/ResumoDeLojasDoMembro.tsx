"use client";
import { useQuery } from "@tanstack/react-query";

import { useT } from "@/hooks/i18n/useT";
import { lerResumoDeLojasDaEquipe } from "./salvar";

/** "Lojas: L15, BASE" embaixo do nome na lista da Equipe — personalização da Ótica Mabe. */
export function ResumoDeLojasDoMembro({ userId, papel }: { userId: string; papel: string }) {
  const t = useT();
  const { data } = useQuery({ queryKey: ["mabe-lojas-equipe"], queryFn: () => lerResumoDeLojasDaEquipe(), staleTime: 30_000 });
  if (!data?.ok) return null;
  const texto = papel === "admin" ? t("Todas as lojas (admin)") : data.porPessoa[userId] || t("Nenhuma loja");
  return (
    <div className={`text-xs ${texto === t("Nenhuma loja") && data.trava ? "text-warning-fg" : "text-muted-foreground"}`}>
      {t("Lojas")}: {texto === "Todas as lojas" ? t("Todas as lojas") : texto}
    </div>
  );
}
