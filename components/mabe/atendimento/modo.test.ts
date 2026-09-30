import { describe, expect, it } from "vitest";

import { PADRAO } from "@/components/mabe/ajustes/ajustes";
import { modoDoInbox, podeTrocarModo } from "./modo";

const tudo = PADRAO;

describe("modoDoInbox (personalização Mabe)", () => {
  it("mesa desligada: todos no completo, cookie ignorado", () => {
    expect(modoDoInbox("atendente", "agent", { ...PADRAO, mesa: false })).toBe("completo");
  });
  it("interruptor principal desligado: nada da Mabe", () => {
    expect(modoDoInbox("atendente", "agent", { ...PADRAO, ativo: false })).toBe("completo");
    expect(podeTrocarModo("admin", { ...PADRAO, ativo: false })).toBe(false);
  });
  it("padrão por papel", () => {
    expect(modoDoInbox(undefined, "agent", tudo)).toBe("atendente");
    expect(modoDoInbox(undefined, "admin", tudo)).toBe("completo");
  });
  it("atendente sem permissão de trocar fica na mesa", () => {
    const regras = { ...PADRAO, atendente_troca: false };
    expect(modoDoInbox("completo", "agent", regras)).toBe("atendente");
    expect(podeTrocarModo("agent", regras)).toBe(false);
    expect(modoDoInbox("atendente", "manager", regras)).toBe("atendente");
  });
});
