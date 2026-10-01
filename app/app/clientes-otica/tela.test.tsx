// Clientes da ótica (personalização Ótica Mabe): a lista pinta os três estados. Dados FICTÍCIOS.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }) }));

import type { ClienteResumo, Painel } from "@/lib/mabe/erp/tipos";
import { TelaDeClientes, type Estado } from "./_client";

const estado: Estado = { q: "", unidade: null, loja: null, filtro: "todos", ordem: "recentes", pagina: 1 };
const lojas = { L01: "L01 · Loja Teste" };
const painel: Painel = {
  atualizado_em: "2026-10-01T13:00:00Z",
  total: 3,
  lojas: [
    { loja: "L01", clientes: 2, compradores: 2, ativos_12m: 1, sem_compra_12m: 1, novos_30d: 0, os_abertas: 1, os_prontas: 1, aniversariantes_mes: 1, total_gasto: 900, ticket_medio: 450 },
    { loja: null, clientes: 1, compradores: 0, ativos_12m: 0, sem_compra_12m: 0, novos_30d: 1, os_abertas: 0, os_prontas: 0, aniversariantes_mes: 0, total_gasto: 0, ticket_medio: null },
  ],
};
const cliente: ClienteResumo = {
  cpf: "00000000191",
  nome: "Fulana de Teste",
  telefone1: "91999990000",
  telefone2: null,
  telefone3: null,
  bairro: null,
  cidade: "Belém",
  estado: "PA",
  data_nascimento: "1990-10-15",
  loja_original: null,
  cadastrado: true,
  loja: "L01",
  compras: 2,
  total_gasto: 900,
  primeira_compra: "2024-01-10",
  ultima_compra: "2026-07-01",
  os_abertas: 1,
  os_prontas: 1,
  gerado_em: null,
};

const pintar = (p: Partial<Parameters<typeof TelaDeClientes>[0]>) =>
  render(
    <TelaDeClientes
      painel={{ ok: true, valor: painel }}
      busca={{ ok: true, valor: { total: 1, limite: 50, offset: 0, itens: [cliente] } }}
      estado={estado}
      lojas={lojas}
      hoje="2026-10-01"
      fuso="America/Belem"
      {...p}
    />,
  );

describe("tela Clientes da ótica", () => {
  it("resumo, grade de unidades e de lojas e linha do cliente com selos", () => {
    pintar({ estado: { ...estado, unidade: "para" } });
    expect(screen.getByText("Por unidade")).toBeInTheDocument();
    expect(screen.getAllByText("Pará").length).toBeGreaterThan(0);
    expect(screen.getByText("atualizado às 10:00", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("L01 · Loja Teste")).toBeInTheDocument();
    expect(screen.getByText("Sem loja")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fulana de Teste" })).toHaveAttribute("href", "/app/clientes-otica/00000000191");
    expect(screen.getByText("000.000.001-91")).toBeInTheDocument();
    expect(screen.getByText("(91) 99999-0000")).toBeInTheDocument();
    expect(screen.getByText("Pronta p/ retirada")).toBeInTheDocument();
    expect(screen.getByText("Aniversário no mês")).toBeInTheDocument();
    expect(screen.getByText("há 3 meses")).toBeInTheDocument();
  });

  it("lista vazia oferece limpar os filtros", () => {
    pintar({ busca: { ok: true, valor: { total: 0, limite: 50, offset: 0, itens: [] } }, estado: { ...estado, q: "ninguém" } });
    expect(screen.getByText("Nenhum cliente encontrado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Limpar busca e filtros" })).toHaveAttribute("href", "/app/clientes-otica");
  });

  it("base fora do ar: um aviso só, com a frase do motivo", () => {
    pintar({ painel: { ok: false, motivo: "indisponivel" }, busca: { ok: false, motivo: "indisponivel" } });
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByText(/Não consegui falar com a base da ótica/)).toBeInTheDocument();
  });
});
