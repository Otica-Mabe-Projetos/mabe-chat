"use client";
/**
 * Cartões por loja + detalhe da loja escolhida (?loja=L15) — personalização da
 * Ótica Mabe. Atualiza sozinho a cada 30 s (router.refresh, sem recarregar a página).
 */
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { SEM_LOJA, type LojaNoPainel } from "@/components/mabe/lojas/painel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

/** Mesma régua da mesa: amarelo a partir de 5 min, vermelho a partir de 15. */
function tomDaEspera(min: number): string {
  return min >= 15 ? "text-error-fg" : min >= 5 ? "text-warning-fg" : "text-text-muted";
}

function tempo(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ${min % 60} min` : `${Math.floor(h / 24)} d`;
}

function Etapa({ rotulo, n, alerta }: { rotulo: string; n: number; alerta?: string }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-elevated px-2.5 py-2">
      <p className={cn("text-xl font-semibold tabular-nums", alerta)}>{n}</p>
      <p className="truncate text-xs text-text-muted">{rotulo}</p>
    </div>
  );
}

export function PainelDeLojas({
  lojas,
  selecionada,
  erro,
}: {
  lojas: LojaNoPainel[];
  selecionada: string | null;
  erro: boolean;
}) {
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [router]);

  const detalhe = lojas.find((l) => l.codigo === selecionada) ?? null;

  if (lojas.length === 0) {
    return (
      <Card className="max-w-xl p-5 text-sm text-text-muted">
        {t("Nenhuma loja para mostrar. Ligue os números às lojas em Configurações › Lojas.")}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {erro ? <p className="text-sm text-error-fg">{t("Não consegui ler parte das conversas agora. Os números podem estar incompletos.")}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {lojas.map((l) => {
          const ativa = l.codigo === selecionada;
          const caido = l.numeros.some((n) => !n.conectado);
          return (
            <Link
              key={l.codigo}
              href={ativa ? "/app/lojas" : `/app/lojas?loja=${encodeURIComponent(l.codigo)}`}
              scroll={false}
              className={cn(
                "rounded-lg border bg-surface p-4 transition-colors hover:border-accent",
                ativa ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    <span className="mr-1.5 font-mono text-xs text-text-muted">{l.codigo}</span>
                    {t(l.nome)}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {l.cidade ? `${l.cidade} · ` : ""}
                    {l.numeros.length} {l.numeros.length === 1 ? t("número") : t("números")}
                    {caido ? <span className="text-error-fg"> · {t("número desconectado")}</span> : null}
                  </p>
                </div>
                {l.maiorEsperaMin > 0 ? (
                  <span className={cn("shrink-0 text-xs font-medium tabular-nums", tomDaEspera(l.maiorEsperaMin))}>
                    {t("espera")} {tempo(l.maiorEsperaMin)}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <Etapa rotulo={t("Novos")} n={l.novos} alerta={l.novos > 0 ? "text-accent" : undefined} />
                <Etapa rotulo={t("Em atendimento")} n={l.emAtendimento} />
                <Etapa rotulo={t("Esperando")} n={l.esperando} alerta={l.esperando > 0 ? tomDaEspera(l.maiorEsperaMin) : undefined} />
                <Etapa rotulo={t("Concluídos hoje")} n={l.concluidosHoje} />
              </div>
            </Link>
          );
        })}
      </div>

      {detalhe ? <DetalheDaLoja loja={detalhe} /> : null}
    </div>
  );
}

function DetalheDaLoja({ loja }: { loja: LojaNoPainel }) {
  const t = useT();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <span className="mr-2 font-mono text-sm text-text-muted">{loja.codigo}</span>
          {t(loja.nome)}
        </h2>
        {loja.numeros.length ? (
          <Button asChild size="sm">
            <Link
              href={
                loja.codigo === SEM_LOJA
                  ? `/app/inbox?aba=novos&numero=${loja.numeros[0]?.id}`
                  : `/app/inbox?aba=novos&loja=${encodeURIComponent(loja.codigo)}`
              }
            >
              {t("Abrir as conversas desta loja")}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">{t("Quem está atendendo")}</h3>
          {loja.atendentes.length === 0 ? (
            <p className="text-sm text-text-muted">{t("Ninguém com conversa em andamento agora.")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-text-muted">
                <tr>
                  <th className="py-1 font-medium">{t("Atendente")}</th>
                  <th className="py-1 text-right font-medium">{t("Em atendimento")}</th>
                  <th className="py-1 text-right font-medium">{t("Esperando")}</th>
                  <th className="py-1 text-right font-medium">{t("Maior espera")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loja.atendentes.map((a) => (
                  <tr key={a.id}>
                    <td className="truncate py-1.5">
                      <Link
                        href={`/app/inbox?atendente=${a.id}&nome=${encodeURIComponent(a.nome)}${loja.codigo === SEM_LOJA ? "" : `&loja=${encodeURIComponent(loja.codigo)}`}`}
                        className="underline-offset-2 hover:text-accent hover:underline"
                        title={t("Ver as conversas desta pessoa")}
                      >
                        {a.nome}
                      </Link>
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{a.emAtendimento}</td>
                    <td className="py-1.5 text-right tabular-nums">{a.esperando}</td>
                    <td className={cn("py-1.5 text-right tabular-nums", tomDaEspera(a.maiorEsperaMin))}>
                      {a.esperando ? tempo(a.maiorEsperaMin) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {loja.novos > 0 ? (
            <p className="mt-3 text-xs text-text-muted">
              {loja.novos} {t("conversa(s) sem ninguém atendendo, em Novos.")}
            </p>
          ) : null}
        </Card>

        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">{t("Esperando resposta há mais tempo")}</h3>
          {loja.parados.length === 0 ? (
            <p className="text-sm text-text-muted">{t("Nenhum cliente esperando resposta.")}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {loja.parados.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/app/inbox?id=${p.id}&numero=${p.numeroId}`}
                    className="flex items-center gap-3 py-1.5 hover:text-accent"
                  >
                    <span className="min-w-0 flex-1 truncate">{p.contato}</span>
                    <span className="shrink-0 truncate text-xs text-text-muted">{p.atendente ?? t("Novos")}</span>
                    <span className={cn("w-20 shrink-0 text-right text-xs font-medium tabular-nums", tomDaEspera(p.esperaMin))}>
                      {tempo(p.esperaMin)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold">{t("Concluídos hoje, por motivo")}</h3>
          {loja.motivos.length === 0 ? (
            <p className="text-sm text-text-muted">{t("Nenhum atendimento concluído hoje.")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {loja.motivos.map((m) => (
                <span key={m.motivo} className="rounded-full bg-surface-elevated px-3 py-1 text-sm">
                  {m.motivo} <span className="font-semibold tabular-nums">{m.n}</span>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
