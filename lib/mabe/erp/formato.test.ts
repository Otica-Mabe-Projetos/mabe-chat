// Clientes da ótica (personalização Ótica Mabe): helpers puros. Dados FICTÍCIOS.
import { describe, expect, it } from "vitest";

import {
  aniversarioNoMes,
  dataBr,
  formatarCpf,
  formatarTelefone,
  grau,
  haQuanto,
  horaBr,
  idade,
  moeda,
  telefoneParaConversa,
} from "./formato";
import { humanizar, rotulo, CONTATO_CRM, FORMA_DE_PAGAMENTO, statusDaOs } from "./rotulos";
import { buscaSchema, cpfSchema, lerEstadoDaUrl, mensagemDoMotivo, normalizarTermo, telefoneSchema } from "./tipos";

describe("formatadores", () => {
  it("CPF com máscara, e zero à esquerda devolvido", () => {
    expect(formatarCpf("12345678900")).toBe("123.456.789-00");
    expect(formatarCpf("123.456.789-00")).toBe("123.456.789-00");
    expect(formatarCpf("2345678900")).toBe("023.456.789-00");
    expect(formatarCpf(null)).toBe("—");
  });

  it("telefone BR com e sem 55; desconhecido volta como veio", () => {
    expect(formatarTelefone("5591999990000")).toBe("(91) 99999-0000");
    expect(formatarTelefone("9132220000")).toBe("(91) 3222-0000");
    expect(formatarTelefone("123")).toBe("123");
    expect(formatarTelefone(null)).toBe("—");
    expect(telefoneParaConversa("(91) 99999-0000")).toBe("+5591999990000");
    expect(telefoneParaConversa("123")).toBeNull();
  });

  it("moeda pt-BR e datas dd/mm/aaaa sem andar dia", () => {
    expect(moeda(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
    expect(moeda(null)).toBe("—");
    expect(dataBr("2026-01-01")).toBe("01/01/2026");
    // 02h UTC do dia 2 ainda é dia 1 em Belém (UTC-3)
    expect(dataBr("2026-01-02T02:00:00Z", "America/Belem")).toBe("01/01/2026");
    expect(horaBr("2026-01-02T13:05:00Z", "America/Belem")).toBe("10:05");
    expect(dataBr("lixo")).toBe("—");
  });

  it("idade em anos completos", () => {
    expect(idade("1990-10-02", "2026-10-01")).toBe(35);
    expect(idade("1990-10-01", "2026-10-01")).toBe(36);
    expect(idade(null, "2026-10-01")).toBeNull();
  });

  it("aniversário no mês", () => {
    expect(aniversarioNoMes("1990-10-20", "2026-10-01")).toBe(true);
    expect(aniversarioNoMes("1990-09-20", "2026-10-01")).toBe(false);
  });

  it("há quanto tempo", () => {
    expect(haQuanto("2026-09-20", "2026-10-01")).toBe("há menos de 1 mês");
    expect(haQuanto("2026-08-01", "2026-10-01")).toBe("há 2 meses");
    expect(haQuanto("2026-09-01", "2026-10-01")).toBe("há 1 mês");
    expect(haQuanto("2025-10-01", "2026-10-01")).toBe("há 1 ano");
    expect(haQuanto("2024-08-01", "2026-10-01")).toBe("há 2 anos e 2 meses");
    expect(haQuanto(null, "2026-10-01")).toBe("");
  });

  it("grau da receita com sinal e vírgula", () => {
    expect(grau(1.25)).toBe("+1,25");
    expect(grau("-0.5")).toBe("-0,50");
    expect(grau(0)).toBe("0,00");
    expect(grau(null)).toBe("—");
    expect(grau(90, false)).toBe("90,00");
  });
});

describe("rótulos do ERP", () => {
  it("status da OS por índice e mapas", () => {
    expect(statusDaOs(3)).toBe("Pronta para retirada");
    expect(statusDaOs(9)).toBe("—");
    expect(rotulo(CONTATO_CRM, "nao_quer_contato")).toBe("Não quer contato");
    expect(rotulo(FORMA_DE_PAGAMENTO, "ume")).toBe("Crediário UME");
    expect(rotulo(FORMA_DE_PAGAMENTO, "boleto_bancario")).toBe("Boleto bancario");
    expect(humanizar(null)).toBe("—");
  });
});

describe("validação das entradas", () => {
  it("termo: dígitos com máscara viram só dígitos; nome fica", () => {
    expect(normalizarTermo("123.456.789-00")).toBe("12345678900");
    expect(normalizarTermo("(91) 9999")).toBe("919999");
    expect(normalizarTermo("  Maria   da Silva ")).toBe("Maria da Silva");
    expect(normalizarTermo("12")).toBe("12");
    expect(normalizarTermo("")).toBeNull();
  });

  it("busca: padrões, loja e limites", () => {
    expect(buscaSchema.parse({})).toEqual({ termo: null, loja: null, filtro: "todos", ordem: "recentes", limite: 50, offset: 0 });
    expect(buscaSchema.parse({ loja: "l05" }).loja).toBe("L05");
    expect(buscaSchema.parse({ loja: "sem_loja" }).loja).toBe("sem_loja");
    expect(buscaSchema.safeParse({ loja: "X1" }).success).toBe(false);
    expect(buscaSchema.safeParse({ filtro: "tudo" }).success).toBe(false);
    expect(buscaSchema.safeParse({ limite: 500 }).success).toBe(false);
    expect(buscaSchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it("CPF e telefone", () => {
    expect(cpfSchema.parse("123.456.789-00")).toBe("12345678900");
    expect(cpfSchema.safeParse("abc").success).toBe(false);
    expect(cpfSchema.safeParse("12").success).toBe(false);
    expect(telefoneSchema.parse("+55 (91) 99999-0000")).toBe("5591999990000");
    expect(telefoneSchema.safeParse("1234").success).toBe(false);
  });

  it("estado da URL: valor estranho cai no padrão", () => {
    expect(lerEstadoDaUrl({ q: "ana", loja: "l02", filtro: "prontas", ordem: "gasto", pagina: "3" })).toEqual({
      q: "ana",
      loja: "L02",
      filtro: "prontas",
      ordem: "gasto",
      pagina: 3,
    });
    expect(lerEstadoDaUrl({ loja: "zzz", filtro: "x", ordem: "y", pagina: "-2" })).toEqual({
      q: "",
      loja: null,
      filtro: "todos",
      ordem: "recentes",
      pagina: 1,
    });
  });

  it("todo motivo de erro tem frase", () => {
    expect(mensagemDoMotivo("sem_conexao")).toMatch(/base de clientes/);
    expect(mensagemDoMotivo("lento")).toMatch(/demorou/);
  });
});
