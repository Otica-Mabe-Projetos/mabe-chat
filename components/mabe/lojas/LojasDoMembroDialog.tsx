"use client";
/**
 * "Lojas que atende" — personalização da Ótica Mabe. O editor aparece dentro da
 * janela de Interface do membro (Equipe) e no diálogo próprio (Equipe e
 * Configurações › Lojas). Só admin grava (definirAcessoDoMembro).
 */
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";
import { definirAcessoDoMembro, lerAcessoDoMembro } from "./salvar";

type LojaResumo = { codigo: string; nome: string; cidade: string };

/** O editor em si (sem moldura), com o próprio botão "Salvar lojas". */
export function EditorDeLojasDoMembro({ userId, onSalvo }: { userId: string; onSalvo?: () => void }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [lojas, setLojas] = useState<LojaResumo[] | null>(null);
  const [todas, setTodas] = useState(false);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [trava, setTrava] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [salvando, iniciar] = useTransition();

  useEffect(() => {
    let vivo = true;
    lerAcessoDoMembro(userId)
      .then((r) => {
        if (!vivo) return;
        if (!r.ok) return setErro(r.erro);
        setLojas(r.lojas);
        setTodas(r.todas);
        setMarcadas(r.marcadas);
        setTrava(r.trava);
      })
      // Falha de rede/servidor não é falta de permissão: mostra e deixa tentar de novo.
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
    };
  }, [userId, tentativa]);

  if (erro) return null; // quem não é admin não edita lojas: o bloco some
  if (falhou) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-error-fg">{t("Não consegui carregar as lojas. Tente de novo.")}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => {
            setFalhou(false);
            setTentativa((n) => n + 1);
          }}>
          {t("Tentar de novo")}
        </Button>
      </div>
    );
  }
  if (!lojas) return <p className="text-sm text-text-muted">{t("Carregando lojas…")}</p>;

  const alternar = (codigo: string) =>
    setMarcadas((m) => (m.includes(codigo) ? m.filter((c) => c !== codigo) : [...m, codigo]));

  const salvar = () =>
    iniciar(async () => {
      const r = await definirAcessoDoMembro(userId, { todas, lojas: marcadas });
      if (!r.ok) return void toast.error(t(r.erro));
      if (r.aviso) toast.warning(t(r.aviso));
      else toast.success(t("Lojas salvas."));
      void qc.invalidateQueries({ queryKey: ["mabe-lojas-equipe"] });
      router.refresh();
      onSalvo?.();
    });

  return (
    <div className="space-y-3">
      {!trava ? (
        <p className="rounded-md bg-warning-bg px-3 py-2 text-xs text-warning-fg">
          {t("A restrição por loja está desligada: por enquanto todos veem todas as lojas. Ligue em Configurações › Lojas.")}
        </p>
      ) : null}
      <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-accent)]"
          checked={todas}
          onChange={(e) => setTodas(e.target.checked)}
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{t("Todas as lojas")}</span>
          <span className="block text-xs text-text-muted">{t("Para supervisão: vê o WhatsApp de todas as lojas.")}</span>
        </span>
      </label>
      <div className={cn("grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto", todas && "pointer-events-none opacity-50")}>
        {lojas.map((l) => (
          <label
            key={l.codigo}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-elevated"
          >
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-accent)]"
              checked={marcadas.includes(l.codigo)}
              onChange={() => alternar(l.codigo)}
            />
            <span className="shrink-0 font-mono text-xs text-text-muted">{l.codigo}</span>
            <span className="truncate">{l.nome}</span>
          </label>
        ))}
      </div>
      <Button type="button" variant="outline" disabled={salvando} onClick={salvar}>
        {salvando ? t("Salvando…") : t("Salvar lojas")}
      </Button>
    </div>
  );
}

/** Diálogo próprio "Lojas que atende". */
export function LojasDoMembroDialog({ userId, nome, onClose }: { userId: string; nome: string; onClose: () => void }) {
  const t = useT();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Lojas que atende")}</DialogTitle>
          <DialogDescription>
            {nome} — {t("vê e atende só as conversas dos números destas lojas.")}
          </DialogDescription>
        </DialogHeader>
        <EditorDeLojasDoMembro userId={userId} onSalvo={onClose} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("Fechar")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** "Lojas: L15, BASE" embaixo do nome na lista da Equipe (some para quem não é admin). */
export { ResumoDeLojasDoMembro } from "./ResumoDeLojasDoMembro";
