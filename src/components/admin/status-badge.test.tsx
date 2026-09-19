// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FUNNEL_STAGE_STYLES,
  FUNNEL_STAGE_TONES,
  FUNNEL_PHASE_TONES,
  FunnelStageBadge,
  StatusBadge,
} from "./status-badge";
import { FUNNEL_STAGES, FUNNEL_STAGE_PHASES } from "@/lib/applications";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

/** Cenário "Cobertura dos estágios" do spec da bko-03. */
describe("cor do estágio", () => {
  it("cobre os 21 estágios sem cair em cor padrão", () => {
    expect(FUNNEL_STAGES).toHaveLength(21);
    for (const stage of FUNNEL_STAGES) {
      expect(FUNNEL_STAGE_TONES[stage], stage).toMatch(/^text-[a-z-]+$/);
      expect(FUNNEL_STAGE_STYLES[stage].className, stage).toBe(
        FUNNEL_STAGE_TONES[stage],
      );
    }
  });

  it("deriva a cor da FASE, não de um segundo mapa por estágio", () => {
    // As exceções documentadas vivem dentro de `outcome`, e só lá.
    const exceptions = new Set([
      "rejected",
      "withdrawn",
      "no_response",
      "ghosted",
      "skipped",
    ]);
    for (const phase of FUNNEL_STAGE_PHASES) {
      for (const stage of phase.stages) {
        if (exceptions.has(stage)) {
          expect(phase.key).toBe("outcome");
          continue;
        }
        expect(FUNNEL_STAGE_TONES[stage], stage).toBe(
          FUNNEL_PHASE_TONES[phase.key],
        );
      }
    }
  });

  it("dá uma cor diferente a cada fase", () => {
    const tones = Object.values(FUNNEL_PHASE_TONES);
    expect(new Set(tones).size).toBe(tones.length);
  });
});

describe("notação de colchete", () => {
  it("mostra o valor cru do enum e guarda o rótulo no title", () => {
    act(() => root.render(<FunnelStageBadge status="applied" />));
    const tag = container.querySelector("[data-slot=status-tag]");
    expect(tag?.textContent).toBe("[applied]");
    expect(tag?.getAttribute("title")).toBe("Enviada");
    expect(tag?.className).toContain("text-cyan");
  });

  it("não pinta fundo nenhum: a etiqueta é texto", () => {
    act(() => root.render(<FunnelStageBadge status="rejected" />));
    const tag = container.querySelector("[data-slot=status-tag]");
    expect(tag?.className).not.toMatch(/\bbg-/);
    expect(tag?.className).toContain("text-destructive");
  });

  it("um valor fora do mapa não quebra: cai em cor de comentário", () => {
    act(() => root.render(<StatusBadge status="valor_novo" styles={{}} />));
    const tag = container.querySelector("[data-slot=status-tag]");
    expect(tag?.textContent).toBe("[valor_novo]");
    expect(tag?.className).toContain("text-comment");
  });
});
