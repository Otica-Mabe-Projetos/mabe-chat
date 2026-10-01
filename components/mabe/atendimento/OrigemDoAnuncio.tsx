"use client";
/**
 * De qual anúncio o lead veio — personalização da Ótica Mabe.
 *
 * O dado já existe: o produto carimba no CONTATO o primeiro anúncio que trouxe a
 * pessoa (`source_metadata.ad_*`, ver lib/leads/atribuicao-de-anuncio.ts), mas só a
 * ficha do contato mostrava. Aqui ele aparece onde o atendente decide o que dizer:
 * uma faixa no topo da conversa e um cartão no painel do cliente. A leitura da
 * origem é a mesma da ficha (`origemDoContato` + hierarquia do anúncio).
 */
import { useState } from "react";

import { useContact } from "@/hooks/contacts/useContact";
import { useHierarquiaDoAnuncio } from "@/hooks/contacts/useHierarquiaDoAnuncio";
import { useT } from "@/hooks/i18n/useT";
import { origemDoContato, type OrigemDoContato } from "@/lib/leads/origem-do-contato";
import { ArrowSquareOut, CaretDown, Megaphone } from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

interface Origem {
  origem: OrigemDoContato;
  veioDeAnuncio: boolean;
  titulo: string | null;
  corpo: string | null;
  link: string | null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : null;
}

/** Só http/https viram link — o valor vem de fora (anúncio), não do produto. */
function linkSeguro(valor: unknown): string | null {
  const bruto = texto(valor);
  if (!bruto) return null;
  try {
    const url = new URL(bruto);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function useOrigem(contactId: string | null): Origem | null {
  const q = useContact(contactId ?? "");
  const contato = q.data?.data;
  const meta = (contato?.source_metadata ?? {}) as Record<string, unknown>;
  const temAnuncio = texto(meta.ad_id) !== null;
  const jaTemNome = typeof meta.campaign_name === "string";
  const hierarquia = useHierarquiaDoAnuncio(contactId ?? "", temAnuncio && !jaTemNome);
  if (!contato) return null;
  const titulo = texto(meta.ad_title);
  const link = linkSeguro(meta.ad_source_url);
  return {
    origem: origemDoContato(hierarquia.data ? { ...meta, ...hierarquia.data } : meta, contato.source),
    veioDeAnuncio: temAnuncio || titulo !== null || link !== null,
    titulo,
    corpo: texto(meta.ad_body),
    link,
  };
}

/** Faixa no topo da conversa. Some quando o lead não veio de anúncio. */
export function FaixaDoAnuncio({
  contactId,
  abertaDeInicio = false,
}: {
  contactId: string | null;
  /** Conversa em Novos: o anúncio já aparece aberto no primeiro contato. */
  abertaDeInicio?: boolean;
}) {
  const t = useT();
  const o = useOrigem(contactId);
  const [aberta, setAberta] = useState(abertaDeInicio);
  if (!o?.veioDeAnuncio) return null;

  return (
    <div className="border-b border-border bg-surface-elevated px-4 py-2 text-sm">
      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        aria-expanded={aberta}
        className="flex w-full min-w-0 items-center gap-2 text-left"
      >
        <Megaphone size={16} weight="regular" className="shrink-0 text-accent" aria-hidden />
        <span className="shrink-0 font-medium">{t("Veio do anúncio")}</span>
        <span className="min-w-0 flex-1 truncate text-text-muted">
          {o.titulo ?? o.origem.anuncio ?? o.origem.campanha ?? o.origem.origem}
        </span>
        <CaretDown
          size={14}
          className={cn("shrink-0 text-text-muted transition-transform", aberta && "rotate-180")}
          aria-hidden
        />
      </button>
      {aberta && <DetalhesDoAnuncio o={o} className="mt-2 pl-6" />}
    </div>
  );
}

/** O próprio canal não diz nada a quem atende: toda conversa aqui é WhatsApp. */
const ORIGENS_GENERICAS = new Set(["whatsapp", "waha", "unknown"]);

/**
 * Seção "De onde veio" do painel do cliente. Só aparece com dado útil: anúncio
 * vira cartão com título; origem não genérica (site, instagram…) vira uma linha
 * discreta; o resto (carregando, "whatsapp", não capturada) não ocupa espaço.
 */
export function CartaoDeOrigem({ contactId }: { contactId: string | null }) {
  const t = useT();
  const o = useOrigem(contactId);
  if (!o) return null;
  if (!o.veioDeAnuncio) {
    const origem = o.origem.origem?.trim();
    if (!origem || ORIGENS_GENERICAS.has(origem.toLowerCase())) return null;
    return (
      <p className="text-xs text-text-muted">
        {t("Origem")}: <span className="text-text">{origem}</span>
      </p>
    );
  }
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-text-muted">{t("De onde veio")}</h3>
      <DetalhesDoAnuncio o={o} />
    </section>
  );
}

function DetalhesDoAnuncio({ o, className }: { o: Origem; className?: string }) {
  const t = useT();
  const linhas: Array<[string, string | null]> = [
    [t("Origem"), o.origem.origem],
    [t("Campanha"), o.origem.campanha],
    [t("Conjunto"), o.origem.conjunto],
    [t("Anúncio"), o.origem.anuncio],
  ];
  return (
    <div className={cn("space-y-2", className)}>
      {o.titulo && <p className="font-medium text-text">{o.titulo}</p>}
      {o.corpo && <p className="whitespace-pre-line text-sm text-text-muted">{o.corpo}</p>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {linhas
          .filter(([, v]) => v)
          .map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="text-text-muted">{rotulo}</dt>
              <dd className="min-w-0 break-words text-text">{valor}</dd>
            </div>
          ))}
      </dl>
      {o.link && (
        <a
          href={o.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
        >
          {t("Ver anúncio")}
          <ArrowSquareOut size={12} aria-hidden />
        </a>
      )}
    </div>
  );
}
