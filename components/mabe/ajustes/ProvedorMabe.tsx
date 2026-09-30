"use client";
import { createContext, useContext } from "react";

import { PADRAO } from "./ajustes";

/** O que as telas de cliente da Mabe precisam saber dos ajustes (montado pela página do Inbox). */
export type ContextoMabe = { podeTrocarModo: boolean; motivos: string[] };

const Contexto = createContext<ContextoMabe>({ podeTrocarModo: false, motivos: PADRAO.motivos });

export function ProvedorMabe({ valor, children }: { valor: ContextoMabe; children: React.ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useMabe = () => useContext(Contexto);
