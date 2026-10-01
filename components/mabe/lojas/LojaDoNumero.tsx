"use client";
/**
 * "Loja deste número" no cartão de cada número em Conexões — personalização da
 * Ótica Mabe. Escolher a loja renomeia o número ("L15 · Manaus Centro") e, com a
 * restrição por loja ligada, as conversas dele ficam só com quem atende a loja.
 */
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { definirLojaDoNumero, lerLojasParaConexoes } from "./salvar";

export function LojaDoNumero({ sessionId }: { sessionId: string }) {
  const t = useT();
  const qc = useQueryClient();
  const [salvando, iniciar] = useTransition();
  // Uma leitura para todos os cartões da tela.
  const { data } = useQuery({ queryKey: ["mabe-lojas"], queryFn: () => lerLojasParaConexoes(), staleTime: 30_000 });
  if (!data?.ok) return null;
  const atual = data.numeros[sessionId] ?? "";

  const trocar = (codigo: string) =>
    iniciar(async () => {
      const r = await definirLojaDoNumero(sessionId, codigo || null);
      if (!r.ok) toast.error(t(r.erro));
      else if (r.aviso) toast.warning(t(r.aviso));
      else toast.success(codigo ? t("Loja do número salva.") : t("Número sem loja."));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["mabe-lojas"] }),
        qc.invalidateQueries({ queryKey: ["channel-sessions"] }),
        qc.invalidateQueries({ queryKey: ["conversations"] }),
      ]);
    });

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        {t("Loja deste número")}
        {data.trava ? null : (
          <Link href="/app/settings/lojas" className="ml-1 font-normal underline underline-offset-2">
            ({t("restrição por loja desligada")})
          </Link>
        )}
      </span>
      <select
        aria-label={t("Loja deste número")}
        className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        value={atual}
        disabled={salvando}
        onChange={(e) => trocar(e.target.value)}
      >
        <option value="">{t("Sem loja")}</option>
        {data.lojas
          .filter((l) => l.ativa || l.codigo === atual)
          .map((l) => (
            <option key={l.codigo} value={l.codigo}>
              {l.rotulo}
              {l.ativa ? "" : ` (${t("desativada")})`}
            </option>
          ))}
      </select>
    </label>
  );
}
