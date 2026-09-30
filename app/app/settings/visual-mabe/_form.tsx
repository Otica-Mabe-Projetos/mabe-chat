"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PADRAO, type AjustesMabe } from "@/components/mabe/ajustes/ajustes";
import { salvarAjustesMabe } from "@/components/mabe/ajustes/salvar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/hooks/i18n/useT";

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
  const mudar = <K extends keyof AjustesMabe>(k: K, v: AjustesMabe[K]) => setAjustes((a) => ({ ...a, [k]: v }));

  const salvar = () =>
    iniciar(async () => {
      const motivos = motivosTexto
        .split("\n")
        .map((m) => m.trim())
        .filter(Boolean);
      const r = await salvarAjustesMabe({ ...ajustes, motivos });
      if (!r.ok) {
        toast.error(t(r.erro));
        return;
      }
      toast.success(t("Ajustes salvos."));
      router.refresh();
    });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Card className="divide-y px-5 py-2">
        <Opcao
          id="mabe-visual"
          titulo={t("Cores da Mabe")}
          descricao={t("Dourado da Ótica Mabe em botões, abas e destaques. Desligado, volta ao visual original do sistema.")}
          checked={ajustes.visual}
          onChange={(v) => mudar("visual", v)}
        />
        <Opcao
          id="mabe-mesa"
          titulo={t("Mesa do atendente")}
          descricao={t("Atendentes veem o Inbox simples: Novos, Meus e Outros, Iniciar atendimento e Concluir com motivo. Desligado, todos usam o Inbox completo.")}
          checked={ajustes.mesa}
          onChange={(v) => mudar("mesa", v)}
        />
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
            {t("Um por linha (até 20, com até 30 letras). Cada motivo vira a etiqueta \"motivo: …\" da conversa, para filtrar depois.")}
          </p>
        </div>
        <Textarea
          id="mabe-motivos"
          rows={9}
          value={motivosTexto}
          onChange={(e) => setMotivosTexto(e.target.value)}
        />
        <Button type="button" variant="ghost" size="sm" onClick={() => setMotivosTexto(PADRAO.motivos.join("\n"))}>
          {t("Voltar aos motivos padrão")}
        </Button>
      </Card>

      <div className="flex gap-2">
        <Button type="button" disabled={salvando} onClick={salvar}>
          {salvando ? t("Salvando…") : t("Salvar")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={salvando}
          onClick={() => {
            setAjustes(PADRAO);
            setMotivosTexto(PADRAO.motivos.join("\n"));
          }}
        >
          {t("Restaurar padrão da Mabe")}
        </Button>
      </div>
    </div>
  );
}
