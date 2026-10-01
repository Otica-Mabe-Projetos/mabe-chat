/**
 * Ficha do cliente da ótica — personalização da Ótica Mabe, fora do upstream.
 *
 * Lida AO VIVO do ERP (`mabe_cli_ficha`): cadastro, OS com linha do tempo,
 * receitas, compras do sistema antigo, orçamentos, contatos de CRM e indicações.
 * Abrir a ficha deixa 1 linha no audit log (lib/mabe/erp/clientes.ts).
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { lerLojas } from "@/components/mabe/lojas/ler";
import { lojaPorCodigo, numerosVisiveis, rotuloDaLoja, type ConfigLojas } from "@/components/mabe/lojas/lojas";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { fichaDoCliente } from "@/lib/mabe/erp/clientes";
import {
  aniversarioNoMes,
  dataBr,
  formatarCpf,
  formatarTelefone,
  grau,
  haQuanto,
  hojeNoFuso,
  idade,
  inteiro,
  moeda,
  telefoneComDdd,
  telefoneParaConversa,
} from "@/lib/mabe/erp/formato";
import { CONTATO_CRM, FORMA_DE_PAGAMENTO, POS_VENDA, RENEGOCIACAO, STATUS_DA_OS, humanizar, rotulo, statusDaOs } from "@/lib/mabe/erp/rotulos";
import { mensagemDoMotivo, type Ficha, type OrdemDeServico, type Receita } from "@/lib/mabe/erp/tipos";
import { Warning } from "@/lib/ui/icons";
import { fusoUtilizavel } from "@/lib/tempo/fusos";
import { cn } from "@/lib/utils";
import { Conversar, TentarDeNovo, Voltar } from "./_acoes";

export const metadata = { title: "Ficha do cliente" };
export const dynamic = "force-dynamic";

type T = (texto: string) => string;
type Ctx = { t: T; fuso: string; hoje: string; cfg: ConfigLojas };

export default async function FichaDoClientePage({ params }: { params: Promise<{ cpf: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const { cpf } = await params;
  const [r, cfg] = await Promise.all([fichaDoCliente(decodeURIComponent(cpf)), lerLojas(activeOrg.orgId)]);
  const t: T = (texto) => traduzir(texto, user.idioma);
  const fuso = fusoUtilizavel(activeOrg.timezone);
  const ctx: Ctx = { t, fuso, hoje: hojeNoFuso(fuso), cfg };

  let corpo: ReactNode;
  if (!r.ok) {
    corpo = (
      <Card role="alert" className="flex items-start gap-3 border-warning-fg/30 bg-warning-bg p-4">
        <Warning size={20} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
          <p className="text-sm text-text">{t(mensagemDoMotivo(r.motivo))}</p>
          <TentarDeNovo />
        </div>
      </Card>
    );
  } else if (!r.valor) {
    corpo = (
      <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-sm font-medium text-text">{t("Nenhum cliente com este CPF na base da ótica.")}</p>
        <Link href="/app/clientes-otica" className="text-sm font-medium text-accent underline-offset-2 hover:underline">
          {t("Voltar para a lista")}
        </Link>
      </Card>
    );
  } else {
    corpo = <FichaCompleta ficha={r.valor} ctx={ctx} permitidos={numerosVisiveis(cfg, user.id, activeOrg.role)} />;
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 sm:p-6">
      <div>
        <Voltar />
      </div>
      {corpo}
    </div>
  );
}

// ── Peças ───────────────────────────────────────────────────────────────────

function rotuloDeLoja(cfg: ConfigLojas, codigo: string | null | undefined, nome?: string | null): string {
  const l = lojaPorCodigo(cfg, codigo);
  return l ? rotuloDaLoja(l) : nome || codigo || "—";
}

function Secao({ titulo, conta, children }: { titulo: string; conta?: number; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 text-base font-semibold text-text">
        {titulo}
        {conta !== undefined ? <span className="text-sm font-normal tabular-nums text-text-muted">{conta}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-text-muted">{children}</p>;
}

function Campo({ rotulo, children, className }: { rotulo: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-text-muted">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-text">{children}</dd>
    </div>
  );
}

/** Tabela com rolagem própria — a página nunca rola de lado no celular. */
function Tabela({ cabecalho, linhas, min = 640 }: { cabecalho: string[]; linhas: ReactNode[][]; min?: number }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: min }}>
          <thead className="border-b border-border bg-surface-elevated text-left text-xs text-text-muted">
            <tr>
              {cabecalho.map((c, i) => (
                <th key={i} scope="col" className="px-3 py-2 font-medium first:pl-4 last:pr-4">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {linhas.map((l, i) => (
              <tr key={i}>
                {l.map((c, j) => (
                  <td key={j} className="px-3 py-2 align-top first:pl-4 last:pr-4">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Ficha ───────────────────────────────────────────────────────────────────

function FichaCompleta({ ficha, ctx, permitidos }: { ficha: Ficha; ctx: Ctx; permitidos: string[] | null }) {
  const { t, fuso, hoje, cfg } = ctx;
  const cad = ficha.cadastro;
  const res = ficha.resumo;
  const nome = cad?.nome || res?.nome || t("Sem nome");
  const cpf = cad?.cpf || res?.cpf || "";
  // Um número por linha, mesmo que o ERP o tenha salvo com e sem DDD em campos diferentes.
  const vistos = new Set<string>();
  const telefones = [cad?.telefone1, cad?.telefone2, cad?.telefone3, res?.telefone1, res?.telefone2, res?.telefone3].filter((x): x is string => {
    if (!x?.trim()) return false;
    const chave = telefoneParaConversa(x, res?.loja) ?? x.trim();
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  const nascimento = cad?.data_nascimento || res?.data_nascimento || null;
  const anos = idade(nascimento, hoje);
  const endereco = [cad?.endereco, cad?.bairro || res?.bairro, [cad?.cidade || res?.cidade, cad?.estado || res?.estado].filter(Boolean).join("/"), cad?.cep ? `CEP ${cad.cep}` : null]
    .filter(Boolean)
    .join(" · ");
  const desde = res?.primeira_compra || cad?.created_at || null;
  const compras = res?.compras ?? 0;
  const gasto = res?.total_gasto ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight break-words text-text">{nome}</h1>
            <p className="mt-0.5 text-sm tabular-nums text-text-muted">CPF {formatarCpf(cpf)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {res?.os_prontas ? <Badge variant="success">{t("Pronta p/ retirada")}</Badge> : null}
            {res?.os_abertas ? <Badge variant="info">{res.os_abertas === 1 ? t("1 OS aberta") : `${res.os_abertas} ${t("OS abertas")}`}</Badge> : null}
            {aniversarioNoMes(nascimento, hoje) ? <Badge variant="default">{t("Aniversário no mês")}</Badge> : null}
            {!cad ? <Badge variant="neutral">{t("Só nas OS (sem cadastro)")}</Badge> : null}
          </div>
        </div>

        {telefones.length ? (
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {telefones.map((tel) => {
              const para = telefoneParaConversa(tel, res?.loja);
              const presumido = telefoneComDdd(tel, res?.loja)?.presumido;
              return (
                <li key={tel} className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-text">{formatarTelefone(tel, res?.loja)}</span>
                  {presumido ? (
                    <span className="text-xs text-text-muted" title={t("O cadastro não tinha DDD; usamos o DDD da loja do cliente.")}>
                      {t("DDD da loja")}
                    </span>
                  ) : null}
                  {para ? <Conversar telefone={para} nome={nome} permitidos={permitidos} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">{t("Sem telefone no cadastro.")}</p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo={t("Loja")}>{rotuloDeLoja(cfg, res?.loja)}</Campo>
          <Campo rotulo={t("Cliente desde")}>
            {desde ? (
              <>
                {dataBr(desde, fuso)} <span className="text-xs text-text-muted">{haQuanto(desde.slice(0, 10), hoje)}</span>
              </>
            ) : (
              "—"
            )}
          </Campo>
          <Campo rotulo={t("Nascimento")}>
            {nascimento ? `${dataBr(nascimento)}${anos !== null ? ` · ${anos} ${t("anos")}` : ""}` : "—"}
          </Campo>
          <Campo rotulo={t("Compras")}>
            <span className="tabular-nums">{inteiro(compras)}</span>
          </Campo>
          <Campo rotulo={t("Total gasto")}>
            <span className="tabular-nums">{moeda(gasto)}</span>
          </Campo>
          <Campo rotulo={t("Ticket médio")}>
            <span className="tabular-nums">{compras ? moeda(gasto / compras) : "—"}</span>
          </Campo>
          <Campo rotulo={t("Endereço")} className="col-span-2 sm:col-span-3 lg:col-span-4">
            {endereco || "—"}
          </Campo>
          <Campo rotulo={t("Última compra")} className="col-span-2">
            {res?.ultima_compra ? `${dataBr(res.ultima_compra, fuso)} · ${haQuanto(res.ultima_compra.slice(0, 10), hoje)}` : t("Nunca comprou")}
          </Campo>
          {cad?.observacao ? (
            <Campo rotulo={t("Observação do cadastro")} className="col-span-2 sm:col-span-3 lg:col-span-6">
              <span className="whitespace-pre-line">{cad.observacao}</span>
            </Campo>
          ) : null}
        </dl>
        {cad?.loja_original || cad?.origem ? (
          <p className="text-xs text-text-muted">
            {cad.loja_original ? `${t("Código da loja no sistema antigo")}: ${cad.loja_original}` : null}
            {cad.loja_original && cad.origem ? " · " : null}
            {cad.origem ? `${t("Origem")}: ${humanizar(cad.origem)}` : null}
          </p>
        ) : null}
      </Card>

      <Receitas os={ficha.os} ctx={ctx} />

      <Secao titulo={t("Ordens de serviço")} conta={ficha.os.length}>
        {ficha.os.length === 0 ? (
          <Vazio>{t("Nenhuma OS no sistema novo.")}</Vazio>
        ) : (
          <div className="flex flex-col gap-3">
            {ficha.os.map((os, i) => (
              <CartaoDaOs key={`${os.numero}-${i}`} os={os} aberta={i === 0 || (!os.cancelado && (os.status_index ?? 4) < 4)} ctx={ctx} />
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo={t("Compras no sistema antigo")} conta={ficha.compras_antigas.length}>
        {ficha.compras_antigas.length === 0 ? (
          <Vazio>{t("Nenhuma compra no sistema antigo.")}</Vazio>
        ) : (
          <Tabela
            cabecalho={[t("Data"), t("Loja"), t("Código"), t("Valor"), t("Observação")]}
            linhas={ficha.compras_antigas.map((c) => [
              <span key="d" className="tabular-nums whitespace-nowrap">{dataBr(c.data, fuso)}</span>,
              <span key="l" className="whitespace-nowrap">{c.loja ? rotuloDeLoja(cfg, c.loja) : c.loja_codigo_antigo || "—"}</span>,
              <span key="c" className="tabular-nums">{c.codigo || "—"}</span>,
              <span key="v" className={cn("tabular-nums whitespace-nowrap", c.cancelada && "text-text-muted line-through")}>
                {moeda(c.valor)}
                {c.cancelada ? <span className="ml-1 text-xs no-underline">({t("cancelada")})</span> : null}
              </span>,
              <span key="o" className="text-text-muted">{c.observacao || "—"}</span>,
            ])}
          />
        )}
      </Secao>

      <Secao titulo={t("Orçamentos")} conta={ficha.orcamentos.length}>
        {ficha.orcamentos.length === 0 ? (
          <Vazio>{t("Nenhum orçamento.")}</Vazio>
        ) : (
          <Tabela
            cabecalho={[t("Data"), t("Loja"), t("Descrição"), t("Valor estimado"), t("Validade"), t("Situação")]}
            linhas={ficha.orcamentos.map((o) => [
              <span key="d" className="tabular-nums whitespace-nowrap">{dataBr(o.em, fuso)}</span>,
              <span key="l" className="whitespace-nowrap">{rotuloDeLoja(cfg, o.loja)}</span>,
              <span key="x">{o.descricao || "—"}</span>,
              <span key="v" className="tabular-nums whitespace-nowrap">{moeda(o.valor_estimado)}</span>,
              <span key="va" className="tabular-nums whitespace-nowrap">{dataBr(o.validade, fuso)}</span>,
              <span key="s">
                {humanizar(o.status)}
                {o.motivo_perda ? <span className="block text-xs text-text-muted">{o.motivo_perda}</span> : null}
                {o.convertido_em ? <span className="block text-xs text-text-muted">{t("convertido em")} {dataBr(o.convertido_em, fuso)}</span> : null}
              </span>,
            ])}
          />
        )}
      </Secao>

      <Secao titulo={t("Contatos de CRM")} conta={ficha.contatos_crm.length}>
        {ficha.contatos_crm.length === 0 ? (
          <Vazio>{t("Nenhum contato de CRM registrado.")}</Vazio>
        ) : (
          <Tabela
            min={560}
            cabecalho={[t("Data"), t("Resultado"), t("Nota"), t("Próximo contato")]}
            linhas={ficha.contatos_crm.map((c) => [
              <span key="d" className="tabular-nums whitespace-nowrap">{dataBr(c.em, fuso)}</span>,
              <span key="s" className="whitespace-nowrap">{t(rotulo(CONTATO_CRM, c.status))}</span>,
              <span key="n" className="whitespace-pre-line text-text-muted">{c.nota || "—"}</span>,
              <span key="p" className="tabular-nums whitespace-nowrap">{dataBr(c.proximo_contato, fuso)}</span>,
            ])}
          />
        )}
      </Secao>

      <Secao titulo={t("Indicações feitas")} conta={ficha.indicacoes_feitas.length}>
        {ficha.indicacoes_feitas.length === 0 ? (
          <Vazio>{t("Nenhuma indicação feita por este cliente.")}</Vazio>
        ) : (
          <Tabela
            min={520}
            cabecalho={[t("Data"), t("Loja"), t("Recompensa"), t("Pagamento")]}
            linhas={ficha.indicacoes_feitas.map((i) => [
              <span key="d" className="tabular-nums whitespace-nowrap">{dataBr(i.em, fuso)}</span>,
              <span key="l" className="whitespace-nowrap">{rotuloDeLoja(cfg, i.loja)}</span>,
              <span key="r">{typeof i.recompensa === "number" ? moeda(i.recompensa) : i.recompensa || "—"}</span>,
              i.pago ? (
                <Badge key="p" variant="success">
                  {t("Pago")} {i.pago_em ? dataBr(i.pago_em, fuso) : ""}
                </Badge>
              ) : (
                <Badge key="p" variant="neutral">{t("A pagar")}</Badge>
              ),
            ])}
          />
        )}
      </Secao>
    </div>
  );
}

// ── Receitas ────────────────────────────────────────────────────────────────

function Receitas({ os, ctx }: { os: OrdemDeServico[]; ctx: Ctx }) {
  const { t, fuso } = ctx;
  const receitas = os
    .filter((o) => o.receita)
    .map((o) => ({ receita: o.receita as Receita, numero: o.numero, quando: o.receita?.created_at || o.entrada }))
    .sort((a, b) => (b.quando ?? "").localeCompare(a.quando ?? ""));
  const [atual, ...anteriores] = receitas;

  return (
    <Secao titulo={t("Receita")}>
      {!atual ? (
        <Vazio>{t("Nenhuma receita registrada nas OS.")}</Vazio>
      ) : (
        <>
          <Card className="flex flex-col gap-3 border-accent/40 p-4">
            <p className="text-sm text-text-muted">
              {t("Mais recente")} · <span className="tabular-nums text-text">{dataBr(atual.quando, fuso)}</span> · {t("OS")} {atual.numero}
            </p>
            <TabelaDaReceita r={atual.receita} t={t} />
          </Card>
          {anteriores.length ? (
            <details className="group rounded-lg border border-border bg-surface">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-text hover:text-accent">
                {t("Receitas anteriores")} ({anteriores.length})
              </summary>
              <div className="flex flex-col gap-4 border-t border-border p-4">
                {anteriores.map((a, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <p className="text-xs text-text-muted">
                      <span className="tabular-nums">{dataBr(a.quando, fuso)}</span> · {t("OS")} {a.numero}
                    </p>
                    <TabelaDaReceita r={a.receita} t={t} />
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      )}
    </Secao>
  );
}

/** Prisma: `null` = sem prisma; "" = marcado sem valor nem base (a tela mostra "Sim"). */
function prisma(ativo: unknown, valor: number | string | null, base: string | null): string | null {
  if (!ativo && (valor === null || valor === "") && !base) return null;
  const v = valor === null || valor === "" ? "" : grau(valor, false);
  return [v, base].filter(Boolean).join(" ");
}

function eixo(v: number | string | null): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `${Math.round(n)}°` : String(v);
}

function medida(v: number | string | null): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `${String(n).replace(".", ",")} mm` : String(v);
}

function TabelaDaReceita({ r, t }: { r: Receita; t: T }) {
  const olhos = [
    { olho: "OD", esf: r.od_esf_longe, cil: r.od_cilindrico, eixo: r.od_eixo, adi: r.od_adicao, perto: r.od_esf_perto, pr: prisma(r.od_prisma, r.od_prisma_valor, r.od_prisma_base), dnp: r.dnp_od, alt: r.altura_od },
    { olho: "OE", esf: r.oe_esf_longe, cil: r.oe_cilindrico, eixo: r.oe_eixo, adi: r.oe_adicao, perto: r.oe_esf_perto, pr: prisma(r.oe_prisma, r.oe_prisma_valor, r.oe_prisma_base), dnp: r.dnp_oe, alt: r.altura_oe },
  ];
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[620px] text-sm">
        <thead className="bg-surface-elevated text-xs text-text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">{t("Olho")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Esférico")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Cilíndrico")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Eixo")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Adição")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Esf. perto")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Prisma")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("DNP")}</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">{t("Altura")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border tabular-nums">
          {olhos.map((o) => (
            <tr key={o.olho}>
              <th scope="row" className="px-3 py-2 text-left font-semibold text-text">{o.olho}</th>
              <td className="px-3 py-2 text-right">{grau(o.esf)}</td>
              <td className="px-3 py-2 text-right">{grau(o.cil)}</td>
              <td className="px-3 py-2 text-right">{eixo(o.eixo)}</td>
              <td className="px-3 py-2 text-right">{grau(o.adi)}</td>
              <td className="px-3 py-2 text-right">{grau(o.perto)}</td>
              <td className="px-3 py-2 text-right">{o.pr === null ? "—" : o.pr || t("Sim")}</td>
              <td className="px-3 py-2 text-right">{medida(o.dnp)}</td>
              <td className="px-3 py-2 text-right">{medida(o.alt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── OS ──────────────────────────────────────────────────────────────────────

function soma(xs: { valor: number | null }[] | null | undefined): number {
  return (xs ?? []).reduce((s, x) => s + (typeof x.valor === "number" ? x.valor : Number(x.valor) || 0), 0);
}

function CartaoDaOs({ os, aberta, ctx }: { os: OrdemDeServico; aberta: boolean; ctx: Ctx }) {
  const { t, fuso, cfg } = ctx;
  const status = os.status_index ?? 0;
  const total = Number(os.valor_total) || 0;
  // Pago = o que os pagamentos somam (que costuma incluir a entrada); sem pagamentos, a entrada.
  const pago = Math.max(soma(os.pagamentos), Number(os.valor_entrada) || 0);
  const saldo = Math.max(0, total - pago);
  const quandoDoStatus = new Map<number, string | null>();
  for (const h of os.historico ?? []) if (typeof h.status_index === "number") quandoDoStatus.set(h.status_index, h.em);
  const armacao = os.armacao ? [os.armacao.marca, os.armacao.modelo, os.armacao.referencia, os.armacao.cor].filter(Boolean).join(" · ") : null;
  const lente = [os.tipo_lente, os.nome_lente, os.faixa_lente].filter(Boolean).join(" · ");

  return (
    <details open={aberta} className="group rounded-lg border border-border bg-surface shadow-xs">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
        <span className="font-semibold text-text">
          {t("OS")} {os.numero}
        </span>
        <span className="text-sm text-text-muted">{rotuloDeLoja(cfg, os.loja, os.loja_nome)}</span>
        <span className="text-sm tabular-nums text-text-muted">{dataBr(os.entrada, fuso)}</span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {os.cancelado ? (
            <Badge variant="error">{t("Cancelada")}</Badge>
          ) : (
            <Badge variant={status === 3 ? "success" : status === 4 ? "neutral" : "info"}>{t(statusDaOs(status))}</Badge>
          )}
          {os.eh_garantia ? <Badge variant="warning">{t("Garantia")}</Badge> : null}
          {os.ocorrencia_aberta ? <Badge variant="error">{t("Ocorrência aberta")}</Badge> : null}
          <span className="text-sm font-medium tabular-nums text-text">{moeda(os.valor_total)}</span>
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
        <LinhaDoTempo status={status} cancelado={!!os.cancelado} quando={quandoDoStatus} ctx={ctx} />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          <Campo rotulo={t("Valor total")}><span className="tabular-nums">{moeda(os.valor_total)}</span></Campo>
          <Campo rotulo={t("Entrada")}><span className="tabular-nums">{moeda(os.valor_entrada)}</span></Campo>
          <Campo rotulo={t("Saldo")}>
            <span className={cn("tabular-nums", saldo > 0 && !os.cancelado && "font-medium text-warning-fg")}>{moeda(saldo)}</span>
          </Campo>
          <Campo rotulo={t("Previsão")}><span className="tabular-nums">{dataBr(os.previsao, fuso)}</span></Campo>
          <Campo rotulo={t("Serviço")}>{os.servico || "—"}</Campo>
          <Campo rotulo={t("Lente")} className="col-span-2 sm:col-span-1 lg:col-span-2">{lente || "—"}</Campo>
          <Campo rotulo={t("Laboratório")}>{os.laboratorio || "—"}</Campo>
          <Campo rotulo={t("Armação")} className="col-span-2">
            {armacao || "—"}
            {os.armacao?.categoria ? <span className="text-text-muted"> · {os.armacao.categoria}</span> : null}
            {os.armacao_origem ? <span className="text-text-muted"> · {humanizar(os.armacao_origem)}</span> : null}
          </Campo>
          <Campo rotulo={t("Técnico")}>{os.tecnico || "—"}</Campo>
          {os.pendencia ? <Campo rotulo={t("Pendência")} className="col-span-2"><span className="text-warning-fg">{os.pendencia}</span></Campo> : null}
          {os.meio_contato ? <Campo rotulo={t("Como chegou")}>{humanizar(os.meio_contato)}</Campo> : null}
          {os.indicacao_otica ? <Campo rotulo={t("Indicação")}>{os.indicacao_otica}</Campo> : null}
        </dl>

        {os.produtos?.length ? (
          <Bloco titulo={t("Produtos")}>
            <ul className="divide-y divide-border text-sm">
              {os.produtos.map((p, i) => (
                <li key={i} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0">{p.nome || "—"}</span>
                  <span className="shrink-0 tabular-nums">{moeda(p.valor)}</span>
                </li>
              ))}
            </ul>
          </Bloco>
        ) : null}

        {os.pagamentos?.length ? (
          <Bloco titulo={t("Pagamentos")}>
            <ul className="divide-y divide-border text-sm">
              {os.pagamentos.map((p, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                  <span className="min-w-0">
                    <span className="tabular-nums text-text-muted">{dataBr(p.data, fuso)}</span> · {t(rotulo(FORMA_DE_PAGAMENTO, p.forma))}
                    {p.parcelas && p.parcelas > 1 ? <span className="text-text-muted"> · {p.parcelas}x</span> : null}
                  </span>
                  <span className="shrink-0 tabular-nums">{moeda(p.valor)}</span>
                </li>
              ))}
            </ul>
          </Bloco>
        ) : null}

        <PosVenda os={os} ctx={ctx} />

        {os.ocorrencias?.length ? (
          <Bloco titulo={t("Ocorrências")}>
            <ul className="flex flex-col gap-2 text-sm">
              {os.ocorrencias.map((o, i) => (
                <li key={i}>
                  <span className="font-medium">{o.motivo || t("Ocorrência")}</span>{" "}
                  <Badge variant={o.resolvida ? "success" : "error"} className="ml-1 px-2">
                    {o.resolvida ? t("Resolvida") : t("Aberta")}
                  </Badge>
                  <span className="ml-2 text-xs tabular-nums text-text-muted">{dataBr(o.em, fuso)}</span>
                  {o.descricao ? <p className="mt-0.5 whitespace-pre-line text-text-muted">{o.descricao}</p> : null}
                </li>
              ))}
            </ul>
          </Bloco>
        ) : null}

        {os.garantia ? (
          <Bloco titulo={t("Garantia")}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              <Campo rotulo={t("Origem")}>{humanizar(os.garantia.origem)}</Campo>
              <Campo rotulo={t("Setor")}>{humanizar(os.garantia.setor)}</Campo>
              <Campo rotulo={t("Armação")}>{os.garantia.armacao || "—"}</Campo>
              <Campo rotulo={t("Descrição")} className="col-span-2 sm:col-span-4">{os.garantia.descricao || "—"}</Campo>
              {os.garantia.comentario ? <Campo rotulo={t("Comentário")} className="col-span-2 sm:col-span-4">{os.garantia.comentario}</Campo> : null}
            </dl>
          </Bloco>
        ) : null}

        {os.renegociacao ? (
          <Bloco titulo={t("Renegociação")}>
            <p className="text-sm">
              <span className="font-medium">{t(rotulo(RENEGOCIACAO, os.renegociacao.status))}</span>
              {os.renegociacao.proximo_contato ? (
                <span className="text-text-muted"> · {t("próximo contato")} {dataBr(os.renegociacao.proximo_contato, fuso)}</span>
              ) : null}
            </p>
            {os.renegociacao.nota ? <p className="mt-1 whitespace-pre-line text-sm text-text-muted">{os.renegociacao.nota}</p> : null}
          </Bloco>
        ) : null}

        {os.historico?.length ? (
          <Bloco titulo={t("Histórico")}>
            <ol className="flex flex-col gap-1.5 text-sm">
              {os.historico.map((h, i) => (
                <li key={i} className="flex flex-wrap gap-x-2">
                  <span className="tabular-nums text-text-muted">{dataBr(h.em, fuso)}</span>
                  <span className="font-medium">{t(statusDaOs(h.status_index))}</span>
                  {h.nota ? <span className="text-text-muted">— {h.nota}</span> : null}
                </li>
              ))}
            </ol>
          </Bloco>
        ) : null}
      </div>
    </details>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-md bg-surface-elevated px-3 py-2.5">
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase">{titulo}</h3>
      {children}
    </div>
  );
}

function LinhaDoTempo({ status, cancelado, quando, ctx }: { status: number; cancelado: boolean; quando: Map<number, string | null>; ctx: Ctx }) {
  const { t, fuso } = ctx;
  return (
    <ol className={cn("grid grid-cols-5 gap-1", cancelado && "opacity-50")} aria-label={t("Andamento da OS")}>
      {STATUS_DA_OS.map((nome, i) => {
        const feito = i <= status;
        const atual = i === status && !cancelado;
        return (
          <li key={nome} className="flex min-w-0 flex-col items-center gap-1 text-center" aria-current={atual ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : feito ? "bg-accent" : "bg-border")} />
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                  feito ? "border-accent bg-accent" : "border-border bg-surface",
                  atual && "ring-4 ring-accent/20",
                )}
              />
              <span className={cn("h-0.5 flex-1", i === 4 ? "bg-transparent" : i < status ? "bg-accent" : "bg-border")} />
            </div>
            <span className={cn("text-[11px] leading-tight", atual ? "font-semibold text-text" : "text-text-muted")}>{t(nome)}</span>
            {quando.get(i) ? <span className="text-[10px] tabular-nums text-text-muted">{dataBr(quando.get(i), fuso)}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function PosVenda({ os, ctx }: { os: OrdemDeServico; ctx: Ctx }) {
  const { t, fuso } = ctx;
  const pv = os.pos_venda;
  const contatos = os.contatos_pos_venda ?? [];
  if (!pv && !os.nps && contatos.length === 0) return null;
  const nps = os.nps;
  const motivos = Array.isArray(nps?.motivos) ? nps.motivos.join(", ") : nps?.motivos;
  return (
    <Bloco titulo={t("Pós-venda")}>
      <div className="flex flex-col gap-2 text-sm">
        {pv ? (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Campo rotulo={t("Situação")}>{pv.status ? t(rotulo(POS_VENDA, pv.status)) : "—"}{pv.nota ? <span className="block text-text-muted">{pv.nota}</span> : null}</Campo>
            <Campo rotulo={t("Contato de 4 dias")}>
              {pv.contato_4d ? dataBr(pv.contato_4d, fuso) : "—"}
              {pv.nota_4d ? <span className="block text-text-muted">{pv.nota_4d}</span> : null}
            </Campo>
            <Campo rotulo={t("Contato de 30 dias")}>
              {pv.contato_30d ? dataBr(pv.contato_30d, fuso) : "—"}
              {pv.nota_30d ? <span className="block text-text-muted">{pv.nota_30d}</span> : null}
            </Campo>
          </dl>
        ) : null}
        {os.nps ? (
          <p>
            <span className="font-medium">NPS</span>{" "}
            <span className={cn("font-semibold tabular-nums", (os.nps.nota ?? 0) >= 9 ? "text-success-fg" : (os.nps.nota ?? 0) >= 7 ? "text-warning-fg" : "text-error-fg")}>
              {os.nps.nota ?? "—"}
            </span>
            <span className="text-xs tabular-nums text-text-muted"> · {dataBr(os.nps.em, fuso)}</span>
            {motivos ? <span className="block text-text-muted">{motivos}</span> : null}
            {os.nps.comentario ? <span className="block whitespace-pre-line text-text-muted">“{os.nps.comentario}”</span> : null}
          </p>
        ) : null}
        {contatos.length ? (
          <ul className="flex flex-col gap-1">
            {contatos.map((c, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="tabular-nums text-text-muted">{dataBr(c.em, fuso)}</span>
                <span className="font-medium">{humanizar(c.tipo)}</span>
                <span>{t(rotulo(POS_VENDA, c.status))}</span>
                {c.nota ? <span className="text-text-muted">— {c.nota}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Bloco>
  );
}
