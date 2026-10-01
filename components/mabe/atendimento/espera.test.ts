import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { colunasDoCelular, esperaDesde, useAgora } from "./espera";

describe("esperaDesde", () => {
  it("última mensagem nossa: não há espera, mesmo com awaiting_since preenchido", () => {
    expect(
      esperaDesde({
        awaiting_since: "2026-09-29T19:22:00Z",
        last_inbound_at: "2026-09-29T19:22:00Z",
        last_outbound_at: "2026-09-29T22:57:00Z",
      }),
    ).toBeNull();
  });

  it("cliente escreveu depois da nossa resposta: conta desde a mais antiga sem resposta", () => {
    expect(
      esperaDesde({
        awaiting_since: "2026-09-29T23:00:00Z",
        last_inbound_at: "2026-09-29T23:10:00Z",
        last_outbound_at: "2026-09-29T22:57:00Z",
      }),
    ).toBe("2026-09-29T23:00:00Z");
  });

  it("nunca respondemos: conta desde a primeira do cliente; sem awaiting_since cai no last_inbound_at", () => {
    expect(esperaDesde({ awaiting_since: null, last_inbound_at: "2026-09-29T10:00:00Z", last_outbound_at: null })).toBe(
      "2026-09-29T10:00:00Z",
    );
    expect(esperaDesde({ last_inbound_at: null, last_outbound_at: null })).toBeNull();
  });
});

describe("colunasDoCelular", () => {
  it("sem conversa aberta: no celular só a lista aparece", () => {
    expect(colunasDoCelular(false)).toEqual({ lista: "flex", conversa: "hidden md:flex" });
  });
  it("com conversa aberta: no celular só a conversa aparece", () => {
    expect(colunasDoCelular(true)).toEqual({ lista: "hidden md:flex", conversa: "flex" });
  });
});

describe("useAgora", () => {
  afterEach(() => vi.useRealTimers());

  it("só anda quando ativo", () => {
    vi.useFakeTimers();
    const ligado = renderHook(() => useAgora(1_000, true));
    const desligado = renderHook(() => useAgora(1_000, false));
    const antesLigado = ligado.result.current;
    const antesDesligado = desligado.result.current;
    act(() => vi.advanceTimersByTime(1_000));
    expect(ligado.result.current).not.toBe(antesLigado);
    expect(desligado.result.current).toBe(antesDesligado);
    expect(vi.getTimerCount()).toBe(1);
  });
});
