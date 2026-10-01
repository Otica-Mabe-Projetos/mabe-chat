import { describe, expect, it } from "vitest";

import { TONS, type Tom } from "@/components/mabe/ajustes/ajustes";
import { camadaMabe, cssDoTom } from "./cor";

const tons = Object.keys(TONS) as Tom[];

function nomes(bloco: string): string[] {
  return [...bloco.matchAll(/(--[\w-]+):/g)].map((m) => m[1] ?? "").sort();
}

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
}

function contraste(a: string, b: string): number {
  const [la, lb] = [luminancia(a), luminancia(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe("cores do Visual Mabe", () => {
  it.each(tons)("o tom %s pinta o accent", (tom) => {
    expect(cssDoTom(tom)).toMatch(/--color-accent: #[0-9a-f]{6}/);
  });

  it("preto é preto, não a rampa verde padrão", () => {
    const css = cssDoTom("preto")!;
    expect(css).not.toContain("#506d48");
    expect(css).toContain("--color-accent: #2b2722");
  });

  it.each(tons)("a camada do tom %s declara os mesmos tokens no claro e no escuro", (tom) => {
    const [claro = "", escuro = ""] = camadaMabe(tom).split(':root:root[data-theme="dark"]');
    expect(nomes(claro).length).toBeGreaterThan(0);
    expect(nomes(claro)).toEqual(nomes(escuro));
  });

  it("dourado usa a seleção clara", () => {
    expect(cssDoTom("dourado")).toContain("#f6ecd6");
  });

  it("texto sutil passa AA nos dois temas", () => {
    expect(contraste("#6b665b", "#faf9f6")).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#8a877b", "#161510")).toBeGreaterThanOrEqual(4.5);
  });
});
