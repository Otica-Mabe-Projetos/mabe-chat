import { describe, expect, it } from "vitest";

import { createTemplateSchema } from "@/lib/schemas/templates";

import { RESPOSTAS_DA_MABE, quaisFaltam } from "./respostas-da-mabe";

describe("respostas rápidas da Mabe", () => {
  it("todas passam no schema oficial de criação", () => {
    for (const r of RESPOSTAS_DA_MABE) {
      expect(createTemplateSchema.safeParse({ ...r, shared: true }).success, r.shortcut).toBe(true);
      expect(r.title.length).toBeLessThanOrEqual(80);
      expect(r.body.length).toBeLessThanOrEqual(4096);
      expect(r.shortcut.length).toBeLessThanOrEqual(40);
      expect(r.shortcut).toMatch(/^\S+$/);
    }
  });

  it("atalhos e títulos são únicos", () => {
    const atalhos = RESPOSTAS_DA_MABE.map((r) => r.shortcut.toLowerCase());
    const titulos = RESPOSTAS_DA_MABE.map((r) => r.title.toLowerCase());
    expect(new Set(atalhos).size).toBe(atalhos.length);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("só usam as variáveis que o composer interpola", () => {
    for (const r of RESPOSTAS_DA_MABE) {
      for (const [, v] of r.body.matchAll(/\{\{([^}]*)\}\}/g)) {
        expect(["nome", "primeiro_nome"]).toContain(v?.trim());
      }
    }
  });

  it("quaisFaltam ignora as que já existem por atalho ou por título", () => {
    expect(quaisFaltam([])).toHaveLength(RESPOSTAS_DA_MABE.length);
    const faltam = quaisFaltam([
      { shortcut: "OLA", title: "Qualquer" },
      { shortcut: null, title: "pós-venda" },
      { shortcut: "outro", title: "Outro" },
    ]);
    expect(faltam.map((r) => r.shortcut)).not.toContain("ola");
    expect(faltam.map((r) => r.shortcut)).not.toContain("posvenda");
    expect(faltam).toHaveLength(RESPOSTAS_DA_MABE.length - 2);
    expect(quaisFaltam(RESPOSTAS_DA_MABE)).toHaveLength(0);
  });
});
