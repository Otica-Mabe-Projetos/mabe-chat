"use client";
/**
 * Configurações › Lojas — personalização da Ótica Mabe. Três blocos:
 * 1. de qual loja é cada número (salva na hora e dá ao número o nome da loja);
 * 2. quem atende cada loja, com a restrição por loja (liga/desliga);
 * 3. o cadastro das lojas.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LojasDoMembroDialog } from "@/components/mabe/lojas/LojasDoMembroDialog";
import { rotuloDaLoja, type ConfigLojas, type Loja } from "@/components/mabe/lojas/lojas";
import {
  definirLojaDoNumero,
  definirTravaPorLoja,
  salvarCadastroDeLojas,
} from "@/components/mabe/lojas/salvar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

export type NumeroDaLoja = {
  id: string;
  telefone: string | null;
  nome: string | null;
  status: string;
  /** Responsáveis configurados; `null` = sem configuração (todos os atendentes recebem). */
  responsaveis: number | null;
};
export type Membro = { id: string; papel: string; nome: string; email: string | null };

const PAPEL: Record<string, string> = { admin: "Admin", manager: "Gerente", agent: "Atendente", viewer: "Leitura" };

function Titulo({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="text-base font-semibold">{titulo}</h2>
      <p className="max-w-2xl text-sm text-text-muted">{descricao}</p>
    </div>
  );
}

export function TelaDeLojas({
  config,
  numeros,
  membros,
}: {
  config: ConfigLojas;
  numeros: NumeroDaLoja[];
  membros: Membro[];
}) {
  const t = useT();
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  const [editando, setEditando] = useState<Membro | null>(null);
  const nomeDaLoja = (codigo: string) => config.lojas.find((l) => l.codigo === codigo)?.nome ?? codigo;

  const acao = (fn: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso: string) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(t(r.erro));
      toast.success(t(sucesso));
      router.refresh();
    });

  const semLoja = membros.filter((m) => m.papel !== "admin" && !config.acesso[m.id]?.todas && !(config.acesso[m.id]?.lojas.length));

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      {/* 1. Números */}
      <section className="space-y-3">
        <Titulo
          titulo={t("Números de WhatsApp")}
          descricao={t("Escolha a loja de cada número. O número passa a aparecer com o nome da loja em todo o sistema, e as conversas dele (inclusive as antigas) ficam na loja.")}
        />
        <Card className="divide-y">
          {numeros.length === 0 ? (
            <p className="p-4 text-sm text-text-muted">{t("Nenhum número conectado ainda. Conecte em Conexões.")}</p>
          ) : (
            numeros.map((n) => {
              const codigo = config.numeros[n.id] ?? "";
              return (
                <div key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium tabular-nums">{n.telefone ?? n.nome ?? t("Número sem nome")}</p>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span className={cn(n.status === "WORKING" ? "text-success-fg" : "text-warning-fg")}>
                        {n.status === "WORKING" ? t("Conectado") : t("Desconectado")}
                      </span>
                      {n.responsaveis === null ? (
                        <Link href="/app/settings/atendimento" className="underline underline-offset-2">
                          {t("sem responsáveis: todos os atendentes recebem")}
                        </Link>
                      ) : (
                        <span>
                          {n.responsaveis} {t("responsável(is)")}
                        </span>
                      )}
                    </p>
                  </div>
                  <select
                    aria-label={t("Loja do número")}
                    className="h-9 min-w-56 rounded-md border border-border bg-surface px-2 text-sm"
                    value={codigo}
                    disabled={ocupado}
                    onChange={(e) =>
                      acao(() => definirLojaDoNumero(n.id, e.target.value || null), "Loja do número salva.")
                    }
                  >
                    <option value="">{t("Sem loja")}</option>
                    {config.lojas
                      .filter((l) => l.ativa || l.codigo === codigo)
                      .map((l) => (
                        <option key={l.codigo} value={l.codigo}>
                          {rotuloDaLoja(l)}
                          {l.ativa ? "" : ` (${t("desativada")})`}
                        </option>
                      ))}
                  </select>
                </div>
              );
            })
          )}
        </Card>
      </section>

      {/* 2. Quem atende */}
      <section className="space-y-3">
        <Titulo
          titulo={t("Quem atende cada loja")}
          descricao={t("Marque as lojas de cada pessoa. Com a restrição ligada, cada um só vê as conversas dos números das suas lojas — no Inbox, na mesa, na busca e em link direto. Admin sempre vê tudo.")}
        />
        <Card className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("Restrição por loja")}</p>
              <p className="text-sm text-text-muted">
                {config.trava
                  ? t("Ligada: quem não tem loja marcada não vê nenhuma conversa.")
                  : t("Desligada: todos veem todas as lojas. Marque as lojas das pessoas antes de ligar.")}
              </p>
              {!config.trava && semLoja.length > 0 ? (
                <p className="text-sm text-warning-fg">
                  {semLoja.length} {t("pessoa(s) ainda sem loja — ao ligar, não verão nenhuma conversa.")}
                </p>
              ) : null}
            </div>
            <Switch
              checked={config.trava}
              disabled={ocupado}
              aria-label={t("Restrição por loja")}
              onCheckedChange={(v) =>
                acao(() => definirTravaPorLoja(v), v ? "Restrição por loja ligada." : "Restrição por loja desligada.")
              }
            />
          </div>
          <div className="divide-y rounded-md border border-border">
            {membros.map((m) => {
              const a = config.acesso[m.id];
              const resumo =
                m.papel === "admin"
                  ? t("Admin — vê todas")
                  : a?.todas
                    ? t("Todas as lojas")
                    : a?.lojas.length
                      ? a.lojas.map((c) => `${c} ${nomeDaLoja(c)}`).join(", ")
                      : t("Nenhuma loja");
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.nome}</p>
                    <p className="truncate text-xs text-text-muted">
                      <Badge variant="outline" className="mr-1.5 px-1.5 py-0 text-[11px]">
                        {t(PAPEL[m.papel] ?? m.papel)}
                      </Badge>
                      <span className={cn(resumo === t("Nenhuma loja") && "text-warning-fg")}>{resumo}</span>
                    </p>
                  </div>
                  {m.papel !== "admin" ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditando(m)}>
                      {t("Lojas")}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* 3. Cadastro */}
      <CadastroDeLojas lojas={config.lojas} ocupado={ocupado} onSalvar={(l) => acao(() => salvarCadastroDeLojas(l), "Lojas salvas.")} />

      {editando ? <LojasDoMembroDialog userId={editando.id} nome={editando.nome} onClose={() => setEditando(null)} /> : null}
    </div>
  );
}

function CadastroDeLojas({
  lojas,
  ocupado,
  onSalvar,
}: {
  lojas: Loja[];
  ocupado: boolean;
  onSalvar: (lojas: Loja[]) => void;
}) {
  const t = useT();
  const [lista, setLista] = useState<Loja[]>(lojas);
  // Código de loja já salva não muda (números e pessoas apontam para ele): só nome, cidade e ativa.
  const salvas = new Set(lojas.map((l) => l.codigo));
  const mudar = (i: number, campo: keyof Loja, valor: string | boolean) =>
    setLista((l) => l.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  const mudou = JSON.stringify(lista) !== JSON.stringify(lojas);

  return (
    <section className="space-y-3">
      <Titulo
        titulo={t("Cadastro das lojas")}
        descricao={t("Código (como nas campanhas: L01, L15…), nome e cidade. Desative a loja que não usa mais.")}
      />
      <Card className="space-y-2 p-4">
        <div className="grid grid-cols-[5.5rem_1fr_1fr_auto_2rem] gap-2 px-1 text-xs font-medium text-text-muted">
          <span>{t("Código")}</span>
          <span>{t("Nome")}</span>
          <span>{t("Cidade")}</span>
          <span>{t("Ativa")}</span>
          <span />
        </div>
        {lista.map((l, i) => {
          const nova = !salvas.has(l.codigo) || lista.findIndex((x) => x.codigo === l.codigo) !== i;
          return (
            <div key={i} className="grid grid-cols-[5.5rem_1fr_1fr_auto_2rem] items-center gap-2">
              <Input
                value={l.codigo}
                maxLength={8}
                readOnly={!nova}
                title={nova ? undefined : t("O código de uma loja salva não muda.")}
                onChange={(e) => mudar(i, "codigo", e.target.value.toUpperCase())}
                className={cn("font-mono", !nova && "bg-surface-elevated")}
              />
              <Input value={l.nome} maxLength={40} onChange={(e) => mudar(i, "nome", e.target.value)} />
              <Input value={l.cidade} maxLength={40} onChange={(e) => mudar(i, "cidade", e.target.value)} />
              <Switch checked={l.ativa} aria-label={t("Ativa")} onCheckedChange={(v) => mudar(i, "ativa", v)} />
              {nova ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={t("Remover linha")}
                  onClick={() => setLista((x) => x.filter((_, j) => j !== i))}
                >
                  ×
                </Button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLista((l) => [...l, { codigo: "", nome: "", cidade: "", ativa: true }])}
          >
            {t("Adicionar loja")}
          </Button>
          <Button type="button" size="sm" disabled={!mudou || ocupado} onClick={() => onSalvar(lista)}>
            {t("Salvar lojas")}
          </Button>
        </div>
      </Card>
    </section>
  );
}
