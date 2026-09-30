"use client";
import { createContext, useContext } from "react";

import { PADRAO } from "./ajustes";

/** O que as telas de cliente da Mabe precisam saber dos ajustes (montado pela página do Inbox). */
export type ContextoMabe = {
  podeTrocarModo: boolean;
  motivos: string[];
  /** Números (channel_session_id) que a pessoa enxerga pela restrição por loja; `null` = todos. */
  numerosPermitidos?: string[] | null;
};

const Contexto = createContext<ContextoMabe>({ podeTrocarModo: false, motivos: PADRAO.motivos, numerosPermitidos: null });

export function ProvedorMabe({ valor, children }: { valor: ContextoMabe; children: React.ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useMabe = () => useContext(Contexto);

/** O número pode aparecer para esta pessoa? (restrição por loja, components/mabe/lojas) */
export function numeroPermitido(permitidos: string[] | null | undefined, id: string): boolean {
  return !permitidos || permitidos.includes(id);
}
