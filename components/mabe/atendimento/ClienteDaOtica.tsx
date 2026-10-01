"use client";
/**
 * "Cliente da ótica" no painel da mesa — personalização da Ótica Mabe.
 *
 * Pelo telefone do contato da conversa, quem é essa pessoa na base do ERP das
 * lojas (GET /api/v1/mabe/clientes/por-conversa). Carrega à parte: o resto do
 * painel nunca espera por ele, e erro aqui vira uma linha, não um painel quebrado.
 */
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/i18n/useT";
import { dataBr, haQuanto, hojeNoFuso, inteiro, moeda, soDigitos } from "@/lib/mabe/erp/formato";
import type { ClienteDaConversa } from "@/lib/mabe/erp/tipos";
import { ArrowSquareOut, Storefront } from "@/lib/ui/icons";

async function buscar(conversa: string): Promise<ClienteDaConversa[]> {
  const res = await fetch(`/api/v1/mabe/clientes/por-conversa?conversa=${encodeURIComponent(conversa)}`);
  const json = (await res.json().catch(() => ({}))) as { data?: { clientes: ClienteDaConversa[] }; error?: { message?: string } };
  if (!res.ok || !json.data) throw new Error(json.error?.message ?? "Não consegui consultar a base da ótica.");
  return json.data.clientes;
}

export function ClienteDaOtica({ conversationId }: { conversationId: string }) {
  const t = useT();
  const q = useQuery({
    queryKey: ["mabe-cliente-da-otica", conversationId],
    queryFn: () => buscar(conversationId),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <section aria-labelledby="cliente-da-otica">
      <h3 id="cliente-da-otica" className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
        <Storefront size={14} aria-hidden />
        {t("Cliente da ótica")}
      </h3>
      {q.isPending ? (
        <div className="space-y-2 rounded-md border border-border p-3" aria-busy="true">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : q.isError ? (
        <p className="rounded-md border border-border px-3 py-2 text-xs text-text-muted">
          {t(q.error.message)}{" "}
          <button type="button" onClick={() => void q.refetch()} className="text-accent underline-offset-2 hover:underline">
            {t("Tentar de novo")}
          </button>
        </p>
      ) : q.data.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-text-muted">{t("Não encontrado na base da ótica")}</p>
      ) : (
        <ul className="space-y-2">
          {q.data.slice(0, 3).map((c) => (
            <CartaoDoCliente key={c.cpf} c={c} />
          ))}
          {q.data.length > 3 ? (
            <li className="text-xs text-text-muted">
              +{q.data.length - 3} {t("com este telefone")}
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

function CartaoDoCliente({ c }: { c: ClienteDaConversa }) {
  const t = useT();
  const hoje = hojeNoFuso(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return (
    <li className="rounded-md border border-border bg-surface p-3">
      <p className="truncate text-sm font-medium text-text">{c.nome || t("Sem nome")}</p>
      <p className="truncate text-xs text-text-muted">{c.loja_rotulo || t("Sem loja")}</p>
      {c.os_prontas || c.os_abertas ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {c.os_prontas ? <Badge variant="success" className="px-2">{t("Pronta p/ retirada")}</Badge> : null}
          {c.os_abertas ? (
            <Badge variant="info" className="px-2">
              {c.os_abertas === 1 ? t("1 OS aberta") : `${c.os_abertas} ${t("OS abertas")}`}
            </Badge>
          ) : null}
        </div>
      ) : null}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div className="min-w-0">
          <dt className="text-text-muted">{t("Cliente desde")}</dt>
          <dd className="tabular-nums text-text">{dataBr(c.primeira_compra)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-text-muted">{t("Compras")}</dt>
          <dd className="tabular-nums text-text">{inteiro(c.compras)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-text-muted">{t("Total gasto")}</dt>
          <dd className="tabular-nums text-text">{moeda(c.total_gasto)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-text-muted">{t("Última compra")}</dt>
          <dd className="text-text">
            {c.ultima_compra ? (
              <>
                <span className="tabular-nums">{dataBr(c.ultima_compra)}</span>
                <span className="block text-text-muted">{haQuanto(c.ultima_compra, hoje)}</span>
              </>
            ) : (
              t("Nunca comprou")
            )}
          </dd>
        </div>
      </dl>
      <Link
        href={`/app/clientes-otica/${soDigitos(c.cpf)}`}
        target="_blank"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
      >
        {t("Ver ficha")}
        <ArrowSquareOut size={12} aria-hidden />
      </Link>
    </li>
  );
}
