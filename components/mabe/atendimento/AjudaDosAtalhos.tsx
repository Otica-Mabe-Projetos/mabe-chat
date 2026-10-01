"use client";
/**
 * Atalhos da mesa do atendente — personalização da Ótica Mabe. O diálogo oficial
 * (`ShortcutsHelpDialog`) tem a lista fixa do Inbox, onde "e" fecha sem motivo.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";

const ATALHOS: { teclas: string; descricao: string }[] = [
  { teclas: "j / k", descricao: "Próximo / anterior na lista" },
  { teclas: "a", descricao: "Iniciar atendimento" },
  { teclas: "r", descricao: "Focar a resposta" },
  { teclas: "e", descricao: "Concluir com motivo" },
  { teclas: "t", descricao: "Transferir" },
  { teclas: "1 / 2 / 3", descricao: "Abas Novos, Meus e Outros" },
  { teclas: "?", descricao: "Mostrar atalhos" },
];

export function AjudaDosAtalhos({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Atalhos de teclado")}</DialogTitle>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {ATALHOS.map((a) => (
            <li key={a.teclas} className="flex items-center justify-between gap-4">
              <span className="text-text-muted">{t(a.descricao)}</span>
              <kbd className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-xs">
                {a.teclas}
              </kbd>
            </li>
          ))}
        </ul>
        <p className="text-sm text-text-muted">{t("Digite / no campo de resposta para respostas rápidas.")}</p>
      </DialogContent>
    </Dialog>
  );
}
