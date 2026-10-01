"use client";
/**
 * Clientes da ótica — a parte interativa da lista (personalização Ótica Mabe).
 *
 * Todo o estado mora na URL (`?q=&loja=&filtro=&ordem=&pagina=`): F5 e link
 * compartilhado abrem a mesma lista. A busca troca a URL com `router.replace`
 * dentro de uma transição, então a lista atual fica na tela (esmaecida) até a
 * nova chegar do servidor.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useT } from "@/hooks/i18n/useT";
import { aniversarioNoMes, dataBr, formatarCpf, formatarTelefone, haQuanto, horaBr, inteiro, moeda, soDigitos } from "@/lib/mabe/erp/formato";
import { ROTULO_DA_ORDEM, ROTULO_DO_FILTRO } from "@/lib/mabe/erp/rotulos";
import {
  FILTROS,
  ORDENS,
  POR_PAGINA,
  SEM_LOJA,
  mensagemDoMotivo,
  type ClienteResumo,
  type Filtro,
  type LojaDoPainel,
  type Ordem,
  type Painel,
  type ResultadoDaBusca,
  type ResultadoErp,
} from "@/lib/mabe/erp/tipos";
import { CaretLeft, CaretRight, CircleNotch, MagnifyingGlass, Warning } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

export type Estado = { q: string; loja: string | null; filtro: Filtro; ordem: Ordem; pagina: number };

const BASE = "/app/clientes-otica";

/** URL da lista com o estado trocado; volta para a página 1 quando o recorte muda. */
function urlCom(estado: Estado, troca: Partial<Estado>): string {
  const e = { ...estado, pagina: 1, ...troca };
  const p = new URLSearchParams();
  if (e.q.trim()) p.set("q", e.q.trim());
  if (e.loja) p.set("loja", e.loja);
  if (e.filtro !== "todos") p.set("filtro", e.filtro);
  if (e.ordem !== "recentes") p.set("ordem", e.ordem);
  if (e.pagina > 1) p.set("pagina", String(e.pagina));
  const s = p.toString();
  return s ? `${BASE}?${s}` : BASE;
}

export function TelaDeClientes(props: {
  painel: ResultadoErp<Painel>;
  busca: ResultadoErp<ResultadoDaBusca>;
  estado: Estado;
  lojas: Record<string, string>;
  hoje: string;
  fuso: string;
}) {
  const t = useT();
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const ir = useCallback((url: string) => iniciar(() => router.replace(url, { scroll: false })), [router]);
  const { painel, busca, estado } = props;

  // Os dois falharam pelo mesmo motivo (base fora do ar, sem conexão): um aviso só.
  if (!painel.ok && !busca.ok && painel.motivo === busca.motivo) {
    return <AvisoDeErro mensagem={t(mensagemDoMotivo(busca.motivo))} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {painel.ok ? (
        <ResumoGeral painel={painel.valor} hoje={props.hoje} fuso={props.fuso} />
      ) : (
        <AvisoDeErro mensagem={t(mensagemDoMotivo(painel.motivo))} />
      )}
      {painel.ok && painel.valor.lojas.length > 0 ? (
        <GradeDeLojas lojas={painel.valor.lojas} rotulos={props.lojas} estado={estado} ir={ir} />
      ) : null}

      <section className="flex flex-col gap-3" aria-labelledby="lista-de-clientes">
        <h2 id="lista-de-clientes" className="sr-only">
          {t("Lista de clientes")}
        </h2>
        <BarraDeBusca estado={estado} ir={ir} carregando={carregando} />
        <ChipsDeFiltro estado={estado} painel={painel.ok ? painel.valor : null} ir={ir} />
        {estado.loja ? (
          <p className="text-sm text-text-muted">
            {t("Loja")}: <span className="font-medium text-text">{estado.loja === SEM_LOJA ? t("Sem loja") : (props.lojas[estado.loja] ?? estado.loja)}</span>{" "}
            <button type="button" onClick={() => ir(urlCom(estado, { loja: null }))} className="ml-1 text-accent underline-offset-2 hover:underline">
              {t("ver todas as lojas")}
            </button>
          </p>
        ) : null}
        {busca.ok ? (
          <div className={cn("transition-opacity", carregando && "pointer-events-none opacity-60")} aria-busy={carregando}>
            <TabelaDeClientes resultado={busca.valor} estado={estado} lojas={props.lojas} hoje={props.hoje} ir={ir} />
          </div>
        ) : (
          <AvisoDeErro mensagem={t(mensagemDoMotivo(busca.motivo))} />
        )}
      </section>
    </div>
  );
}

function AvisoDeErro({ mensagem }: { mensagem: string }) {
  const t = useT();
  const router = useRouter();
  return (
    <Card role="alert" className="flex items-start gap-3 border-warning-fg/30 bg-warning-bg p-4">
      <Warning size={20} className="mt-0.5 shrink-0 text-warning-fg" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">{mensagem}</p>
        <button type="button" onClick={() => router.refresh()} className="mt-2 text-sm font-medium text-accent underline-offset-2 hover:underline">
          {t("Tentar de novo")}
        </button>
      </div>
    </Card>
  );
}

function soma(lojas: LojaDoPainel[], k: keyof LojaDoPainel): number {
  return lojas.reduce((s, l) => s + (typeof l[k] === "number" ? (l[k] as number) : 0), 0);
}

function ResumoGeral({ painel, hoje, fuso }: { painel: Painel; hoje: string; fuso: string }) {
  const t = useT();
  const l = painel.lojas;
  const quando = painel.atualizado_em
    ? dataBr(painel.atualizado_em, fuso) === dataBr(hoje)
      ? `${t("atualizado às")} ${horaBr(painel.atualizado_em, fuso)}`
      : `${t("atualizado em")} ${dataBr(painel.atualizado_em, fuso)} ${t("às")} ${horaBr(painel.atualizado_em, fuso)}`
    : null;
  const numeros: { rotulo: string; valor: number; tom?: string }[] = [
    { rotulo: t("Clientes"), valor: painel.total },
    { rotulo: t("Compradores"), valor: soma(l, "compradores") },
    { rotulo: t("Ativos 12 meses"), valor: soma(l, "ativos_12m") },
    { rotulo: t("OS em andamento"), valor: soma(l, "os_abertas"), tom: "text-info-fg" },
    { rotulo: t("Prontas p/ retirada"), valor: soma(l, "os_prontas"), tom: "text-success-fg" },
    { rotulo: t("Aniversariantes do mês"), valor: soma(l, "aniversariantes_mes"), tom: "text-accent" },
  ];
  return (
    <section aria-label={t("Resumo da base")} className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {numeros.map((n) => (
          <Card key={n.rotulo} className="px-4 py-3">
            <p className={cn("text-2xl font-semibold tabular-nums", n.tom)}>{inteiro(n.valor)}</p>
            <p className="truncate text-xs text-text-muted">{n.rotulo}</p>
          </Card>
        ))}
      </div>
      {quando ? <p className="text-xs text-text-muted">{t("Números da base")} · {quando}</p> : null}
    </section>
  );
}

function GradeDeLojas(props: { lojas: LojaDoPainel[]; rotulos: Record<string, string>; estado: Estado; ir: (url: string) => void }) {
  const t = useT();
  // L01..L15 em ordem, "Sem loja" no fim.
  const lojas = [...props.lojas].sort((a, b) => (a.loja ?? "~").localeCompare(b.loja ?? "~"));
  return (
    <section aria-label={t("Clientes por loja")} className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-text">{t("Por loja")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {lojas.map((l) => {
          const codigo = l.loja ?? SEM_LOJA;
          const ativa = props.estado.loja === codigo;
          const nome = l.loja ? (props.rotulos[l.loja] ?? l.loja) : t("Sem loja");
          return (
            <button
              key={codigo}
              type="button"
              aria-pressed={ativa}
              onClick={() => props.ir(urlCom(props.estado, { loja: ativa ? null : codigo }))}
              className={cn(
                "rounded-lg border bg-surface p-3 text-left transition-colors hover:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden",
                ativa ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-text">{nome}</p>
                <p className="shrink-0 text-lg font-semibold tabular-nums text-text">{inteiro(l.clientes)}</p>
              </div>
              <dl className="grid grid-cols-3 gap-1.5 text-xs">
                <Dado rotulo={t("Ativos 12m")} valor={inteiro(l.ativos_12m)} />
                <Dado rotulo={t("OS abertas")} valor={inteiro(l.os_abertas)} tom={l.os_abertas ? "text-info-fg" : undefined} />
                <Dado rotulo={t("Prontas")} valor={inteiro(l.os_prontas)} tom={l.os_prontas ? "text-success-fg" : undefined} />
                <Dado rotulo={t("Ticket médio")} valor={moeda(l.ticket_medio)} largo />
                <Dado rotulo={t("Total gasto")} valor={moeda(l.total_gasto)} largo />
              </dl>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Dado({ rotulo, valor, tom, largo }: { rotulo: string; valor: string; tom?: string; largo?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-md bg-surface-elevated px-2 py-1.5", largo && "col-span-3 flex items-baseline justify-between gap-2 sm:col-span-3")}>
      <dt className="truncate text-text-muted">{rotulo}</dt>
      <dd className={cn("truncate font-medium tabular-nums text-text", tom)}>{valor}</dd>
    </div>
  );
}

function BarraDeBusca({ estado, ir, carregando }: { estado: Estado; ir: (url: string) => void; carregando: boolean }) {
  const t = useT();
  const [texto, setTexto] = useState(estado.q);
  const ultimo = useRef(estado.q);

  // A URL mudou por fora (voltar do navegador, chip): o campo acompanha.
  useEffect(() => {
    if (estado.q !== ultimo.current) {
      ultimo.current = estado.q;
      setTexto(estado.q);
    }
  }, [estado.q]);

  // Busca enquanto digita, com 400 ms de folga.
  useEffect(() => {
    if (texto.trim() === ultimo.current.trim()) return;
    const id = window.setTimeout(() => {
      ultimo.current = texto;
      ir(urlCom(estado, { q: texto }));
    }, 400);
    return () => window.clearTimeout(id);
  }, [texto, estado, ir]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form
        role="search"
        className="relative min-w-0 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          ultimo.current = texto;
          ir(urlCom(estado, { q: texto }));
        }}
      >
        <MagnifyingGlass size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" aria-hidden />
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Buscar por nome, CPF ou telefone")}
          aria-label={t("Buscar por nome, CPF ou telefone")}
          autoComplete="off"
          maxLength={100}
          className="h-10 w-full rounded-md border border-border bg-surface pr-9 pl-9 text-sm text-text placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden"
        />
        {carregando ? (
          <CircleNotch size={16} className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-text-muted" aria-label={t("Buscando…")} />
        ) : null}
      </form>
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <span className="shrink-0">{t("Ordenar por")}</span>
        <select
          value={estado.ordem}
          onChange={(e) => ir(urlCom(estado, { ordem: e.target.value as Ordem }))}
          className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-sm text-text focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden sm:flex-none"
        >
          {ORDENS.map((o) => (
            <option key={o} value={o}>
              {t(ROTULO_DA_ORDEM[o])}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Quantos clientes cada filtro traz, pelo painel (da loja escolhida, se houver). */
function contagens(painel: Painel | null, loja: string | null): Partial<Record<Filtro, number>> {
  if (!painel) return {};
  const l = loja ? painel.lojas.filter((x) => (x.loja ?? SEM_LOJA) === loja) : painel.lojas;
  const clientes = soma(l, "clientes");
  return {
    todos: loja ? clientes : painel.total,
    os_abertas: soma(l, "os_abertas"),
    prontas: soma(l, "os_prontas"),
    aniversariantes: soma(l, "aniversariantes_mes"),
    ativos_12m: soma(l, "ativos_12m"),
    novos_30d: soma(l, "novos_30d"),
    sem_compra_12m: soma(l, "sem_compra_12m"),
    sem_compra: Math.max(0, clientes - soma(l, "compradores")),
  };
}

function ChipsDeFiltro({ estado, painel, ir }: { estado: Estado; painel: Painel | null; ir: (url: string) => void }) {
  const t = useT();
  const n = contagens(painel, estado.loja);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={t("Filtros")}>
      {FILTROS.map((f) => {
        const ativo = estado.filtro === f;
        // OS abertas e prontas contam OS, não clientes: o número é indicação, não o total da lista.
        const conta = f === "os_abertas" || f === "prontas" ? undefined : n[f];
        return (
          <button
            key={f}
            type="button"
            aria-pressed={ativo}
            onClick={() => ir(urlCom(estado, { filtro: f }))}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden",
              ativo ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface text-text hover:border-accent",
            )}
          >
            {t(ROTULO_DO_FILTRO[f])}
            {conta !== undefined ? <span className={cn("tabular-nums", ativo ? "opacity-80" : "text-text-muted")}>{inteiro(conta)}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function TabelaDeClientes(props: {
  resultado: ResultadoDaBusca;
  estado: Estado;
  lojas: Record<string, string>;
  hoje: string;
  ir: (url: string) => void;
}) {
  const t = useT();
  const router = useRouter();
  const { resultado, estado } = props;
  const filtrando = !!estado.q || !!estado.loja || estado.filtro !== "todos";

  if (resultado.itens.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <MagnifyingGlass size={28} className="text-text-muted" aria-hidden />
        <p className="text-sm font-medium text-text">{t("Nenhum cliente encontrado")}</p>
        <p className="max-w-md text-sm text-text-muted">
          {estado.q
            ? t("Confira a grafia do nome ou digite só os números do CPF ou do telefone.")
            : t("Nenhum cliente neste recorte.")}
        </p>
        {filtrando ? (
          <Link href={BASE} className="mt-2 text-sm font-medium text-accent underline-offset-2 hover:underline">
            {t("Limpar busca e filtros")}
          </Link>
        ) : null}
      </Card>
    );
  }

  const inicio = resultado.offset + 1;
  const fim = resultado.offset + resultado.itens.length;
  const paginas = Math.max(1, Math.ceil(resultado.total / POR_PAGINA));

  return (
    <div className="flex flex-col gap-3">
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="border-b border-border bg-surface-elevated text-left text-xs text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("Cliente")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("CPF")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("Telefone")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("Loja")}</th>
                <th scope="col" className="px-3 py-2.5 font-medium">{t("Cidade")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("Compras")}</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">{t("Total gasto")}</th>
                <th scope="col" className="px-4 py-2.5 font-medium">{t("Última compra")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resultado.itens.map((c) => (
                <LinhaDoCliente key={c.cpf} c={c} lojas={props.lojas} hoje={props.hoje} abrir={(href) => router.push(href)} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted" aria-label={t("Paginação")}>
        <p className="tabular-nums">
          {inteiro(inicio)}–{inteiro(fim)} {t("de")} {inteiro(resultado.total)} {resultado.total === 1 ? t("cliente") : t("clientes")}
        </p>
        <div className="flex items-center gap-2">
          <BotaoDePagina
            desligado={estado.pagina <= 1}
            onClick={() => props.ir(urlCom(estado, { pagina: estado.pagina - 1 }))}
            rotulo={t("Anterior")}
            icone="antes"
          />
          <span className="tabular-nums">
            {t("Página")} {inteiro(estado.pagina)} {t("de")} {inteiro(paginas)}
          </span>
          <BotaoDePagina
            desligado={estado.pagina >= paginas}
            onClick={() => props.ir(urlCom(estado, { pagina: estado.pagina + 1 }))}
            rotulo={t("Próxima")}
            icone="depois"
          />
        </div>
      </nav>
    </div>
  );
}

function BotaoDePagina(props: { desligado: boolean; onClick: () => void; rotulo: string; icone: "antes" | "depois" }) {
  return (
    <button
      type="button"
      disabled={props.desligado}
      onClick={props.onClick}
      className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface px-3 text-sm text-text transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-50"
    >
      {props.icone === "antes" ? <CaretLeft size={14} aria-hidden /> : null}
      {props.rotulo}
      {props.icone === "depois" ? <CaretRight size={14} aria-hidden /> : null}
    </button>
  );
}

function LinhaDoCliente({ c, lojas, hoje, abrir }: { c: ClienteResumo; lojas: Record<string, string>; hoje: string; abrir: (href: string) => void }) {
  const t = useT();
  const href = `${BASE}/${soDigitos(c.cpf)}`;
  const telefone = c.telefone1 || c.telefone2 || c.telefone3;
  const aniversario = aniversarioNoMes(c.data_nascimento, hoje);
  return (
    <tr className="cursor-pointer transition-colors hover:bg-surface-elevated" onClick={() => abrir(href)}>
      <td className="max-w-72 px-4 py-2.5">
        <Link href={href} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-text hover:text-accent">
          {c.nome || t("Sem nome")}
        </Link>
        {c.os_abertas || c.os_prontas || aniversario || !c.cadastrado ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {c.os_prontas ? <Badge variant="success" className="px-2">{t("Pronta p/ retirada")}</Badge> : null}
            {c.os_abertas ? (
              <Badge variant="info" className="px-2">
                {c.os_abertas === 1 ? t("1 OS aberta") : `${c.os_abertas} ${t("OS abertas")}`}
              </Badge>
            ) : null}
            {aniversario ? <Badge variant="default" className="px-2">{t("Aniversário no mês")}</Badge> : null}
            {!c.cadastrado ? <Badge variant="neutral" className="px-2">{t("Só nas OS")}</Badge> : null}
          </div>
        ) : null}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-text-muted">{formatarCpf(c.cpf)}</td>
      <td className="px-3 py-2.5 whitespace-nowrap tabular-nums text-text-muted">{telefone ? formatarTelefone(telefone) : "—"}</td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {c.loja ? (
          <span title={lojas[c.loja] ?? c.loja} className="font-mono text-xs text-text">
            {c.loja}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="max-w-40 truncate px-3 py-2.5 text-text-muted">{[c.cidade, c.estado].filter(Boolean).join("/") || "—"}</td>
      <td className="px-3 py-2.5 text-right tabular-nums">{inteiro(c.compras)}</td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{moeda(c.total_gasto)}</td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        {c.ultima_compra ? (
          <>
            <span className="tabular-nums">{dataBr(c.ultima_compra)}</span>
            <span className="block text-xs text-text-muted">{haQuanto(c.ultima_compra, hoje)}</span>
          </>
        ) : (
          <span className="text-text-muted">{t("Nunca comprou")}</span>
        )}
      </td>
    </tr>
  );
}
