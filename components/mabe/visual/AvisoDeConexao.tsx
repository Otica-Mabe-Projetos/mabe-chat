"use client";
/**
 * Número de WhatsApp desconectado — versão discreta (personalização Ótica Mabe).
 *
 * A faixa oficial (components/app/ConexaoCaidaBanner.tsx) ocupa a largura toda no topo
 * de toda tela e atrapalha o trabalho (pedido do Paulo, 01/10/2026). Aqui vira uma
 * pílula pequena no canto inferior direito, com o mesmo conteúdo e o mesmo link:
 * continua aparecendo em toda tela (o motivo da faixa existir), mas sem cobrir nada.
 * Dá para recolher; volta sozinha se o conjunto de números caídos mudar.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { ConexaoCaida } from "@/lib/channels/health";

const CHAVE = "mabe.aviso-conexao.recolhido";

export function AvisoDeConexao(props: {
  caidas: ConexaoCaida[];
  podeAbrirConexoes: boolean;
  precisaEscanear: boolean;
}) {
  const t = useT();
  const { caidas, podeAbrirConexoes, precisaEscanear } = props;
  const assinatura = caidas.map((c) => c.apelido).sort().join("|");
  const [recolhido, setRecolhido] = useState(false);

  useEffect(() => {
    try {
      setRecolhido(sessionStorage.getItem(CHAVE) === assinatura);
    } catch {
      setRecolhido(false);
    }
  }, [assinatura]);

  const uma = caidas.length === 1 ? caidas[0] : null;
  const recolher = () => {
    setRecolhido(true);
    try {
      sessionStorage.setItem(CHAVE, assinatura);
    } catch {
      /* sem storage: recolhe só nesta tela */
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-[calc(100vw-2rem)] justify-end"
    >
      {recolhido ? (
        <button
          type="button"
          onClick={() => setRecolhido(false)}
          title={uma ? `WhatsApp ${uma.apelido} ${t("está desconectado")}` : `${caidas.length} ${t("conexões")} ${t("de WhatsApp estão desconectadas")}`}
          className="pointer-events-auto flex size-9 items-center justify-center rounded-full border border-error-fg/40 bg-surface shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden"
        >
          <span className="size-2.5 animate-pulse rounded-full bg-error-fg" aria-hidden />
          <span className="sr-only">{t("Mostrar aviso de conexão")}</span>
        </button>
      ) : (
        <div className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-full border border-error-fg/40 bg-surface py-1.5 pr-1.5 pl-3 text-xs text-text shadow-lg">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-error-fg" aria-hidden />
          <span className="min-w-0 truncate">
            {uma ? (
              <>
                <strong className="font-semibold">{uma.apelido}</strong> {t("está desconectado")}
              </>
            ) : (
              <>
                <strong className="font-semibold">
                  {caidas.length} {t("conexões")}
                </strong>{" "}
                {t("de WhatsApp estão desconectadas")}
              </>
            )}
            <span className="sr-only">{` — ${t("nenhuma mensagem entra nem sai.")}`}</span>
          </span>
          {podeAbrirConexoes ? (
            <Link href="/app/connections" className="shrink-0 rounded-full bg-error-bg px-2.5 py-1 font-medium text-error-fg hover:opacity-90">
              {precisaEscanear ? t("Escanear o QR") : t("Ver conexões")}
            </Link>
          ) : (
            <span className="hidden shrink-0 text-text-muted sm:inline">{t("Peça a quem administra para revisar a conexão do WhatsApp.")}</span>
          )}
          <button
            type="button"
            onClick={recolher}
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-elevated hover:text-text"
            aria-label={t("Recolher aviso")}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
