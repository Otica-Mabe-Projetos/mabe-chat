import { describe, expect, it } from "vitest";

import { CONFIG_PADRAO, lojasDeSettings, lojasVisiveis, numerosVisiveis, rotuloDaLoja, type ConfigLojas } from "./lojas";
import { montarPainel, SEM_LOJA, type ConversaDoPainel } from "./painel";

const N1 = "0c5a8f6e-544c-49ee-914c-d76ecff02add";
const N2 = "be631d28-2bb6-4973-ae40-4da4e6916dda";
const U = "11111111-1111-4111-8111-111111111111";

const cfg: ConfigLojas = {
  ...CONFIG_PADRAO,
  numeros: { [N1]: "BASE", [N2]: "L15" },
  acesso: { [U]: { todas: false, lojas: ["L15"] } },
  trava: true,
};

describe("lojas (personalização Mabe)", () => {
  it("sem nada gravado vem com as 17 lojas e a trava desligada", () => {
    const c = lojasDeSettings({});
    expect(c.lojas).toHaveLength(17);
    expect(c.trava).toBe(false);
    expect(rotuloDaLoja(c.lojas[14]!)).toBe("L15 · Manaus Centro");
  });

  it("dado inválido cai no padrão, parte a parte", () => {
    const c = lojasDeSettings({ mabe_lojas: { trava: "sim", numeros: { [N1]: "BASE" } } });
    expect(c.trava).toBe(false);
    expect(c.numeros[N1]).toBe("BASE");
  });

  it("mesma regra da trava do banco", () => {
    expect(lojasVisiveis(cfg, U, "agent")).toEqual(["L15"]);
    expect(numerosVisiveis(cfg, U, "manager")).toEqual([N2]);
    expect(numerosVisiveis(cfg, U, "admin")).toBeNull();
    expect(numerosVisiveis({ ...cfg, trava: false }, U, "agent")).toBeNull();
    expect(numerosVisiveis(cfg, "22222222-2222-4222-8222-222222222222", "agent")).toEqual([]);
    expect(numerosVisiveis({ ...cfg, acesso: { [U]: { todas: true, lojas: [] } } }, U, "agent")).toBeNull();
  });
});

describe("painel de supervisão", () => {
  const agora = new Date("2026-09-30T15:00:00Z");
  const conv = (p: Partial<ConversaDoPainel>): ConversaDoPainel => ({
    id: Math.random().toString(),
    channel_session_id: N2,
    assigned_to_user_id: null,
    assigned_to_user_name: null,
    awaiting_since: null,
    last_inbound_at: null,
    last_outbound_at: null,
    tags: [],
    contato: "Cliente",
    ...p,
  });

  it("monta o funil por loja", () => {
    const painel = montarPainel(
      cfg,
      [
        { id: N1, rotulo: "BASE · Mabe Base", conectado: true },
        { id: N2, rotulo: "L15 · Manaus Centro", conectado: true },
      ],
      [
        conv({ last_inbound_at: "2026-09-30T14:40:00Z" }), // novo, esperando 20 min
        conv({ assigned_to_user_id: U, assigned_to_user_name: "Ana", last_inbound_at: "2026-09-30T14:55:00Z", last_outbound_at: "2026-09-30T14:50:00Z" }),
        conv({ assigned_to_user_id: U, assigned_to_user_name: "Ana", last_inbound_at: "2026-09-30T14:00:00Z", last_outbound_at: "2026-09-30T14:10:00Z" }), // respondido
        conv({ channel_session_id: "33333333-3333-4333-8333-333333333333" }), // número sem loja
      ],
      [conv({ tags: ["motivo: agendou exame"] }), conv({ tags: [] })],
      agora,
    );
    const l15 = painel.find((l) => l.codigo === "L15")!;
    expect(l15).toMatchObject({ novos: 1, emAtendimento: 2, esperando: 2, maiorEsperaMin: 20, concluidosHoje: 2 });
    expect(l15.atendentes).toEqual([{ id: U, nome: "Ana", emAtendimento: 2, esperando: 1, maiorEsperaMin: 5 }]);
    expect(l15.motivos).toEqual(expect.arrayContaining([{ motivo: "agendou exame", n: 1 }, { motivo: "sem motivo", n: 1 }]));
    expect(l15.parados[0]!.esperaMin).toBe(20);
    expect(painel.at(-1)!.codigo).toBe(SEM_LOJA);
    expect(painel.find((l) => l.codigo === "BASE")!.novos).toBe(0);
  });
});
