import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { colunasDoCelular, esperaDesde, formatarEspera, maisAntigoEsperando, tomDaEspera } from "./espera";
import { useAgora } from "./useAgora";

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

describe("tomDaEspera", () => {
  it("régua de 5 e 15 minutos", () => {
    expect(tomDaEspera(4)).toBe("ok");
    expect(tomDaEspera(5)).toBe("atencao");
    expect(tomDaEspera(14)).toBe("atencao");
    expect(tomDaEspera(15)).toBe("atrasado");
  });
});

describe("formatarEspera", () => {
  it("minutos e horas", () => {
    expect(formatarEspera(0.2)).toBe("1 min");
    expect(formatarEspera(3)).toBe("3 min");
    expect(formatarEspera(80)).toBe("1 h 20 min");
    expect(formatarEspera(120)).toBe("2 h");
  });
});

describe("maisAntigoEsperando", () => {
  const agora = new Date("2026-09-29T12:00:00Z");
  it("lista vazia: null", () => {
    expect(maisAntigoEsperando([], agora)).toBeNull();
  });
  it("escolhe a mais antiga e ignora as que não esperam", () => {
    expect(
      maisAntigoEsperando(
        [
          { id: "a", last_inbound_at: "2026-09-29T11:50:00Z", last_outbound_at: null },
          { id: "b", last_inbound_at: "2026-09-29T11:30:00Z", last_outbound_at: "2026-09-29T11:00:00Z" },
          { id: "c", last_inbound_at: "2026-09-29T10:00:00Z", last_outbound_at: "2026-09-29T11:00:00Z" },
        ],
        agora,
      ),
    ).toEqual({ id: "b", minutos: 30, total: 2 });
  });
});
