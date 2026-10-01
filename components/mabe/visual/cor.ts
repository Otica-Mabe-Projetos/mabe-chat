import { TONS, type Tom } from "@/components/mabe/ajustes/ajustes";
import { cssDaMarca } from "@/lib/branding/css";
import { REGUA_DO_PRODUTO } from "@/lib/branding/regua-do-produto";
import { resolverMarca } from "@/lib/branding/resolve";
import { envelopeDeSemente } from "@/lib/branding/schema";

type Tokens = Record<string, string>;
type Camada = { claro: Tokens; escuro: Tokens };

/**
 * Cinzas legíveis (AA) para todos os tons. O oficial deixa o texto sutil em
 * 4,18:1 no claro e 2,81:1 no escuro (horário da lista, ícones). Os dois blocos
 * declaram o MESMO conjunto de tokens: o que só o claro declarasse vazaria para
 * o escuro pela especificidade de `:root:root`. Valores do claro sem mudança
 * são os do `app/globals.css`.
 */
const NEUTROS: Camada = {
  claro: {
    "--color-text-muted": "#5d594f",
    "--color-text-subtle": "#6b665b",
    "--color-neutral-300": "#d2cdbf",
    "--color-neutral-400": "#a9a395",
    "--color-neutral-500": "#6b665b",
  },
  escuro: {
    "--color-text-muted": "#9c998d",
    "--color-text-subtle": "#8a877b",
    "--color-neutral-300": "#9c998d",
    "--color-neutral-400": "#8a877b",
    "--color-neutral-500": "#444239",
  },
};

/** Seleção clara: o soft calculado (#debe84 / #ffcb7b) deixava o texto secundário em 3,9:1. */
const SELECAO: Partial<Record<Tom, Camada>> = {
  dourado: {
    claro: { "--color-accent-soft": "#f6ecd6" },
    escuro: { "--color-accent-soft": "rgba(209, 167, 85, 0.10)" },
  },
  amarelo: {
    claro: { "--color-accent-soft": "#fff3d6" },
    escuro: { "--color-accent-soft": "rgba(255, 177, 0, 0.10)" },
  },
};

/**
 * Preto de verdade. O resolvedor oficial trata preto como "sem matiz" e devolve
 * a rampa verde padrão, então o preto não passa por ele: a rampa inteira é nossa.
 * No escuro a rampa é invertida de propósito — `::selection` escuro usa fundo
 * 700 e texto 50, e o anel de foco usa 400.
 */
const PRETO: Camada = {
  claro: {
    "--color-brand": TONS.preto,
    "--color-accent-50": "#f7f6f3",
    "--color-accent-100": "#efece6",
    "--color-accent-200": "#dedad1",
    "--color-accent-300": "#8a877b",
    "--color-accent-400": "#5d594f",
    "--color-accent-500": "#46433b",
    "--color-accent-600": "#2b2722",
    "--color-accent-700": "#1f1c18",
    "--color-accent-800": "#181512",
    "--color-accent-900": "#120f0d",
    "--color-accent-950": "#0b0908",
    "--color-accent": "#2b2722",
    "--color-accent-hover": "#14120f",
    "--color-accent-fg": "#ffffff",
    "--color-accent-soft": "#efece6",
  },
  escuro: {
    "--color-brand": TONS.preto,
    "--color-accent-50": "#1f1c18",
    "--color-accent-100": "#2b2722",
    "--color-accent-200": "#46433b",
    "--color-accent-300": "#5d594f",
    "--color-accent-400": "#e9e4d8",
    "--color-accent-500": "#bbb8ac",
    "--color-accent-600": "#e9e4d8",
    "--color-accent-700": "#f3efe6",
    "--color-accent-800": "#f7f4ee",
    "--color-accent-900": "#faf8f4",
    "--color-accent-950": "#ffffff",
    "--color-accent": "#e9e4d8",
    "--color-accent-hover": "#ffffff",
    "--color-accent-fg": "#000000",
    "--color-accent-soft": "rgba(233, 228, 216, 0.10)",
  },
};

function bloco(seletor: string, tokens: Tokens): string {
  return `${seletor} {\n${Object.entries(tokens).map(([n, v]) => `  ${n}: ${v};`).join("\n")}\n}`;
}

/** O que a Mabe acrescenta por cima da marca oficial, nos mesmos seletores dela. */
export function camadaMabe(tom: Tom): string {
  const extra = tom === "preto" ? PRETO : SELECAO[tom];
  const claro = { ...NEUTROS.claro, ...extra?.claro };
  const escuro = { ...NEUTROS.escuro, ...extra?.escuro };
  return `${bloco(":root:root", claro)}\n${bloco(':root:root[data-theme="dark"]', escuro)}`;
}

/**
 * O CSS das cores da Mabe para um tom, pelo MESMO caminho da marca oficial
 * (`resolverMarca` + `cssDaMarca`): a rampa sai com o contraste ajustado para
 * claro e escuro, e a `camadaMabe` vem depois. A camada precisa do envelope
 * (`envelopeDeSemente`), não do hex cru — com o hex cru o resolvedor recusa em
 * silêncio e nada é pintado. O preto não usa o oficial (sairia verde).
 */
export function cssDoTom(tom: Tom): string | null {
  if (tom === "preto") return camadaMabe(tom);
  const { cor } = resolverMarca([{ origem: "visual-mabe", cor: envelopeDeSemente(TONS[tom]) }], REGUA_DO_PRODUTO);
  const oficial = cssDaMarca(cor).css;
  return oficial ? `${oficial}\n${camadaMabe(tom)}` : null;
}
