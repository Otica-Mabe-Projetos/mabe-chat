import { describe, expect, it } from "vitest";

import { MOTIVOS_DE_CONCLUSAO, etiquetaDoMotivo, etiquetasComMotivo } from "./motivos";

describe("motivos de conclusão", () => {
  it("cabem no schema de Visual Mabe (até 20, até 30 caracteres, sem repetição)", () => {
    expect(MOTIVOS_DE_CONCLUSAO.length).toBeLessThanOrEqual(20);
    for (const m of MOTIVOS_DE_CONCLUSAO) expect(m.length).toBeLessThanOrEqual(30);
    expect(new Set(MOTIVOS_DE_CONCLUSAO).size).toBe(MOTIVOS_DE_CONCLUSAO.length);
  });

  it("mantém os motivos antigos com o mesmo texto (etiquetas do histórico)", () => {
    for (const antigo of [
      "Agendou exame",
      "Enviou orçamento",
      "Pós-venda resolvido",
      "Sem interesse",
      "Sem resposta do cliente",
      "Fora da área de atendimento",
      "Contato errado ou duplicado",
      "Outro",
    ]) {
      expect(MOTIVOS_DE_CONCLUSAO).toContain(antigo);
    }
  });

  it("troca o motivo antigo e preserva as outras etiquetas", () => {
    const atuais = ["vip", etiquetaDoMotivo("Sem interesse"), "manaus"];
    expect(etiquetasComMotivo(atuais, "Fechou venda")).toEqual([
      "vip",
      "manaus",
      "motivo: fechou venda",
    ]);
  });
});
