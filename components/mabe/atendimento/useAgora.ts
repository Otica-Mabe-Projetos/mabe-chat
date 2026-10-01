"use client";
import { useEffect, useState } from "react";

/**
 * Relógio de quem precisa dele: liga um intervalo só no componente que mostra
 * tempo (e só se `ativo`), em vez de redesenhar a mesa inteira a cada tique.
 */
export function useAgora(ms = 30_000, ativo = true): Date {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    if (!ativo) return;
    const i = setInterval(() => setAgora(new Date()), ms);
    return () => clearInterval(i);
  }, [ms, ativo]);
  return agora;
}
