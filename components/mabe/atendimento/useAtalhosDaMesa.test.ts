import { describe, expect, it } from "vitest";

import { proximoId } from "./useAtalhosDaMesa";

describe("proximoId (atalhos j/k da mesa)", () => {
  const ids = ["a", "b", "c"];

  it("lista vazia não seleciona nada", () => {
    expect(proximoId([], null, 1)).toBeNull();
    expect(proximoId([], "a", -1)).toBeNull();
  });

  it("sem seleção, j pega o primeiro", () => {
    expect(proximoId(ids, null, 1)).toBe("a");
  });

  it("anda um passo", () => {
    expect(proximoId(ids, "a", 1)).toBe("b");
    expect(proximoId(ids, "c", -1)).toBe("b");
  });

  it("para nas pontas", () => {
    expect(proximoId(ids, "c", 1)).toBe("c");
    expect(proximoId(ids, "a", -1)).toBe("a");
  });

  it("selecionado fora da aba recomeça pela ponta", () => {
    expect(proximoId(ids, "z", 1)).toBe("a");
    expect(proximoId(ids, "z", -1)).toBe("c");
  });
});
