/**
 * Clientes da ótica — personalização da Ótica Mabe, fora do upstream.
 *
 * A base de clientes do ERP (lojas físicas) dentro do Mabe Chat: resumo, grade
 * por loja, busca e lista. Os números vêm de uma view do ERP recalculada de hora
 * em hora; a ficha (`[cpf]`) é ao vivo. Todos os membros veem todos os clientes
 * (decisão do Paulo, 01/10/2026). Leitura em lib/mabe/erp.
 */
import { redirect } from "next/navigation";

import { lerLojas } from "@/components/mabe/lojas/ler";
import { numerosVisiveis, rotuloDaLoja } from "@/components/mabe/lojas/lojas";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { buscarClientes, painelDeClientes } from "@/lib/mabe/erp/clientes";
import { hojeNoFuso } from "@/lib/mabe/erp/formato";
import { POR_PAGINA, lerEstadoDaUrl, unidadePorChave } from "@/lib/mabe/erp/tipos";
import { fusoUtilizavel } from "@/lib/tempo/fusos";
import { TelaDeClientes } from "./_client";

export const metadata = { title: "Clientes da ótica" };
export const dynamic = "force-dynamic";

export default async function ClientesDaOticaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const estado = lerEstadoDaUrl(await searchParams);
  const [painel, busca, cfg] = await Promise.all([
    painelDeClientes(),
    buscarClientes({
      termo: estado.q,
      loja: estado.loja,
      lojas: estado.loja ? null : [...(unidadePorChave(estado.unidade)?.lojas ?? [])],
      filtro: estado.filtro,
      ordem: estado.ordem,
      limite: POR_PAGINA,
      offset: (estado.pagina - 1) * POR_PAGINA,
    }),
    lerLojas(activeOrg.orgId),
  ]);

  // "L05" → "L05 · Ananindeua", pelas lojas cadastradas em Configurações › Lojas.
  const lojas: Record<string, string> = {};
  for (const l of cfg.lojas) lojas[l.codigo] = rotuloDaLoja(l);

  const fuso = fusoUtilizavel(activeOrg.timezone);
  const t = (texto: string) => traduzir(texto, user.idioma);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Clientes da ótica")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("Quem já é cliente nas lojas: compras, OS em andamento e receitas. Busque pelo nome, CPF ou telefone.")}
        </p>
      </header>
      <TelaDeClientes
        painel={painel}
        busca={busca}
        estado={estado}
        lojas={lojas}
        hoje={hojeNoFuso(fuso)}
        fuso={fuso}
        permitidos={numerosVisiveis(cfg, user.id, activeOrg.role)}
      />
    </div>
  );
}
