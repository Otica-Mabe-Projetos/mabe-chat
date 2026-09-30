import { describe, expect, it } from "vitest";

import { modoDoInbox, podeTrocarModo } from "./modo";

const tudo = { mesa: true, atendente_troca: true };

describe("modoDoInbox (personalização Mabe)", () => {
  it("mesa desligada: todos no completo, cookie ignorado", () => {
    expect(modoDoInbox("atendente", "agent", { mesa: false, atendente_troca: true })).toBe("completo");
  });
  it("padrão por papel", () => {
    expect(modoDoInbox(undefined, "agent", tudo)).toBe("atendente");
    expect(modoDoInbox(undefined, "admin", tudo)).toBe("completo");
  });
  it("atendente sem permissão de trocar fica na mesa", () => {
    const regras = { mesa: true, atendente_troca: false };
    expect(modoDoInbox("completo", "agent", regras)).toBe("atendente");
    expect(podeTrocarModo("agent", regras)).toBe(false);
    expect(modoDoInbox("atendente", "manager", regras)).toBe("atendente");
  });
});
