"use client";
/**
 * Atalhos de teclado da mesa do atendente — personalização da Ótica Mabe.
 *
 * Não reaproveita o `InboxKeyboardShortcuts` oficial: lá o "e" fecha a conversa
 * sem motivo; aqui ele abre o "Concluir com motivo". Como no oficial, o
 * react-hotkeys-hook ignora tecla digitada em campo (input/textarea), então
 * escrever no compositor nunca dispara atalho.
 */
import { useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import type { Aba } from "./ListaDeAtendimentos";

export type OpcoesDosAtalhos = {
  ativo: boolean;
  /** Ids da aba visível, na ordem em que aparecem na lista. */
  ids: string[];
  selecionado: string | null;
  selecionar: (id: string) => void;
  podeIniciar: boolean;
  iniciar: () => void;
  podeConcluir: boolean;
  concluir: () => void;
  podeTransferir: boolean;
  transferir: () => void;
  focarResposta: () => void;
  mudarAba: (aba: Aba) => void;
  abrirAjuda: () => void;
};

/** Próximo id ao andar `passo` na lista; para nas pontas, sem dar a volta. */
export function proximoId(ids: string[], atual: string | null, passo: number): string | null {
  if (ids.length === 0) return null;
  const i = atual ? ids.indexOf(atual) : -1;
  if (i < 0) return passo > 0 ? ids[0]! : ids[ids.length - 1]!;
  return ids[Math.min(ids.length - 1, Math.max(0, i + passo))]!;
}

export function useAtalhosDaMesa(opts: OpcoesDosAtalhos) {
  // As funções leem sempre a versão mais nova das opções, sem lista de dependências.
  const ref = useRef(opts);
  useEffect(() => {
    ref.current = opts;
  });
  const cfg = { enabled: opts.ativo, preventDefault: true };

  const andar = (passo: number) => {
    const o = ref.current;
    const id = proximoId(o.ids, o.selecionado, passo);
    if (id && id !== o.selecionado) o.selecionar(id);
  };

  useHotkeys("j", () => andar(1), cfg);
  useHotkeys("k", () => andar(-1), cfg);
  useHotkeys("a", () => ref.current.podeIniciar && ref.current.iniciar(), cfg);
  useHotkeys("r", () => ref.current.focarResposta(), cfg);
  useHotkeys("e", () => ref.current.podeConcluir && ref.current.concluir(), cfg);
  useHotkeys("t", () => ref.current.podeTransferir && ref.current.transferir(), cfg);
  useHotkeys("1", () => ref.current.mudarAba("novos"), cfg);
  useHotkeys("2", () => ref.current.mudarAba("meus"), cfg);
  useHotkeys("3", () => ref.current.mudarAba("outros"), cfg);
  useHotkeys("shift+/", () => ref.current.abrirAjuda(), cfg);
}
