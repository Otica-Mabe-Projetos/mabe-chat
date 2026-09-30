"use client";
/**
 * Configurações › Visual Mabe — personalização da Ótica Mabe.
 *
 * Um interruptor principal que liga tudo da Mabe na hora, e ajustes opcionais
 * embaixo. Cada mudança salva sozinha (sem botão "Salvar"); só a lista de motivos,
 * que é texto, tem o próprio botão.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PADRAO, TONS, type AjustesMabe, type Tom } from "@/components/mabe/ajustes/ajustes";
import { salvarAjustesMabe } from "@/components/mabe/ajustes/salvar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

const NOMES_DOS_TONS: Record<Tom, string> = { dourado: "Dourado", amarelo: "Amarelo", preto: "Preto" };

function Opcao({
  id,
  titulo,
  descricao,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  titulo: string;
  descricao: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {titulo}
        </Label>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export function FormularioVisualMabe({ gravado }: { gravado: AjustesMabe }) {
  const t = useT();
  const router = useRouter();
  const [ajustes, setAjustes] = useState(gravado);
  const [motivosTexto, setMotivosTexto] = useState(gravado.motivos.join("\n"));
  const [salvando, iniciar] = useTransition();

  /** Mostra na hora e grava; se o servidor recusar, volta ao que estava. */
  const gravar = (novo: AjustesMabe, aviso?: string) => {
    const antes = ajustes;
    setAjustes(novo);
    iniciar(async () => {
      const r = await salvarAjustesMabe(novo);
      if (!r.ok) {
        setAjustes(antes);
        toast.error(t(r.erro));
        return;
      }
      if (aviso) toast.success(t(aviso));
      router.refresh();
    });
  };
  const mudar = <K extends keyof AjustesMabe>(k: K, v: AjustesMabe[K]) => gravar({ ...ajustes, [k]: v });

  const motivosDigitados = motivosTexto
    .split("\n")
    .map((m) => m.trim())
    .filter(Boolean);
  const motivosMudaram = motivosDigitados.join("\n") !== ajustes.motivos.join("\n");

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card
        className={cn(
          "flex items-center gap-5 p-5 transition-colors",
          ajustes.ativo && "border-accent bg-accent-soft",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mabe/logo.png" alt="Ótica Mabe" className="h-10 w-auto shrink-0 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mabe/logo-escuro.png" alt="Ótica Mabe" className="hidden h-10 w-auto shrink-0 dark:block" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <Label htmlFor="mabe-ativo" className="text-base font-semibold">
            {ajustes.ativo ? t("Visual Mabe ligado") : t("Visual Mabe desligado")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {ajustes.ativo
              ? t("Cores, logo e mesa do atendente da Ótica Mabe valendo para toda a empresa.")
              : t("O sistema está com o visual original da versão oficial.")}
          </p>
        </div>
        <Switch
          id="mabe-ativo"
          className="scale-125"
          checked={ajustes.ativo}
          disabled={salvando}
          onCheckedChange={(v) => mudar("ativo", v)}
        />
      </Card>

      <section className={cn("flex flex-col gap-4", !ajustes.ativo && "opacity-60")}>
        <div>
          <h2 className="text-sm font-semibold">{t("Ajustes")}</h2>
          <p className="text-sm text-muted-foreground">
            {ajustes.ativo
              ? t("Opcional. Cada mudança vale na hora.")
              : t("Guardados para quando o Visual Mabe for ligado de novo.")}
          </p>
        </div>

        <Card className="divide-y px-5 py-2">
          <Opcao
            id="mabe-visual"
            titulo={t("Cores da Mabe")}
            descricao={t("A cor da Mabe em botões, abas e destaques.")}
            checked={ajustes.visual}
            onChange={(v) => mudar("visual", v)}
          />
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("Tom")}</p>
              <p className="text-sm text-muted-foreground">{t("Qual cor da paleta da Mabe pinta o sistema.")}</p>
            </div>
            <div role="radiogroup" aria-label={t("Tom")} className="flex gap-2">
              {(Object.keys(TONS) as Tom[]).map((tom) => (
                <button
                  key={tom}
                  type="button"
                  role="radio"
                  aria-checked={ajustes.tom === tom}
                  disabled={!ajustes.visual}
                  onClick={() => mudar("tom", tom)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm transition-colors disabled:opacity-50",
                    ajustes.tom === tom ? "border-accent bg-accent-soft font-medium" : "hover:bg-surface-elevated",
                  )}
                >
                  <span aria-hidden className="size-4 rounded-full border" style={{ background: TONS[tom] }} />
                  {t(NOMES_DOS_TONS[tom])}
                </button>
              ))}
            </div>
          </div>
          <Opcao
            id="mabe-logo"
            titulo={t("Logo da Ótica Mabe")}
            descricao={t("No topo do menu lateral, na versão clara e na escura.")}
            checked={ajustes.logo}
            onChange={(v) => mudar("logo", v)}
          />
          <Opcao
            id="mabe-mesa"
            titulo={t("Mesa do atendente")}
            descricao={t("Atendentes veem o Inbox simples: Novos, Meus e Outros, Iniciar atendimento e Concluir com motivo.")}
            checked={ajustes.mesa}
            onChange={(v) => mudar("mesa", v)}
          />
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("Quem abre o Inbox na mesa")}</p>
              <p className="text-sm text-muted-foreground">
                {t("Admins e gerentes sempre podem trocar pelo botão \"Modo completo\".")}
              </p>
            </div>
            <div role="radiogroup" aria-label={t("Quem abre o Inbox na mesa")} className="flex gap-2">
              {(["todos", "atendentes"] as const).map((quem) => (
                <button
                  key={quem}
                  type="button"
                  role="radio"
                  aria-checked={ajustes.mesa_para === quem}
                  disabled={!ajustes.mesa}
                  onClick={() => mudar("mesa_para", quem)}
                  className={cn(
                    "min-h-10 rounded-md border px-3 text-sm transition-colors disabled:opacity-50",
                    ajustes.mesa_para === quem ? "border-accent bg-accent-soft font-medium" : "hover:bg-surface-elevated",
                  )}
                >
                  {quem === "todos" ? t("Todos") : t("Só atendentes")}
                </button>
              ))}
            </div>
          </div>
          <Opcao
            id="mabe-troca"
            titulo={t("Atendente pode trocar para o Inbox completo")}
            descricao={t("Mostra o botão \"Modo completo\" para os atendentes. Admins e gerentes sempre podem trocar.")}
            checked={ajustes.atendente_troca}
            disabled={!ajustes.mesa}
            onChange={(v) => mudar("atendente_troca", v)}
          />
        </Card>

        <Card className="space-y-3 p-5">
          <div className="space-y-0.5">
            <Label htmlFor="mabe-motivos" className="text-sm font-medium">
              {t("Motivos de conclusão")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("Um por linha (até 20, com até 30 letras). Cada motivo vira a etiqueta \"motivo: …\" da conversa.")}
            </p>
          </div>
          <Textarea
            id="mabe-motivos"
            rows={8}
            value={motivosTexto}
            onChange={(e) => setMotivosTexto(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={salvando || !motivosMudaram}
              onClick={() => gravar({ ...ajustes, motivos: motivosDigitados }, "Motivos salvos.")}
            >
              {t("Salvar motivos")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMotivosTexto(PADRAO.motivos.join("\n"))}>
              {t("Motivos padrão")}
            </Button>
          </div>
        </Card>

        <div>
          <Button
            type="button"
            variant="ghost"
            disabled={salvando}
            onClick={() => {
              setMotivosTexto(PADRAO.motivos.join("\n"));
              gravar(PADRAO, "Padrão da Mabe restaurado.");
            }}
          >
            {t("Restaurar padrão da Mabe")}
          </Button>
        </div>
      </section>
    </div>
  );
}
