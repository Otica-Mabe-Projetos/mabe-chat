import { describe, expect, it } from "vitest";

import { TONS, type Tom } from "@/components/mabe/ajustes/ajustes";
import { cssDoTom } from "./cor";

describe("cores do Visual Mabe", () => {
  it.each(Object.keys(TONS) as Tom[])("o tom %s pinta o accent", (tom) => {
    const css = cssDoTom(tom);
    expect(css).toMatch(/--color-accent: #[0-9a-f]{6}/);
  });
});
