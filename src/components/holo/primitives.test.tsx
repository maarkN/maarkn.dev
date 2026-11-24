// @vitest-environment jsdom
/**
 * Names and keyboard of every primitive. What only a browser answers (focus
 * visible, the top layer, the states on screen) is in scripts/e2e-holo.mjs.
 */
import { act, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HoloButton, HoloIconButton } from "./button";
import { HoloCard, HoloScreen } from "./card";
import { HoloDialog } from "./dialog";
import { HoloField } from "./field";
import { BeamLink, HoloLink } from "./link";
import { HoloNotice } from "./notice";
import { HoloSwitch } from "./switch";
import { HoloTabs } from "./tabs";
import { HoloTag } from "./tag";
import { textOf } from "./text";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let container: HTMLDivElement;

const render = (node: ReactNode) => act(() => root.render(node));
const $ = <T extends Element = HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
const framed = (el: Element) => el.querySelector("path[data-line]") !== null;
const press = (el: Element, key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
  });

/** The name assistive technology computes, for the cases used here. */
function nameOf(el: Element): string {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) return labelledBy.split(" ").map((id) => document.getElementById(id)?.textContent).join(" ");
  const label = el.getAttribute("aria-label");
  if (label) return label;
  if (el.id) {
    const forIt = document.querySelector(`label[for="${el.id}"]`);
    if (forIt) return forIt.textContent!;
  }
  const visible = el.cloneNode(true) as Element;
  for (const hidden of visible.querySelectorAll("[aria-hidden='true']")) hidden.remove();
  return visible.textContent!.trim();
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("HoloButton", () => {
  it("is a real button, named by its text and not by its icon", () => {
    render(
      <HoloButton>
        <svg aria-hidden="true"><title>mail</title></svg> Falar comigo
      </HoloButton>,
    );
    expect(nameOf($("button"))).toBe("Falar comigo");
    expect($("button").getAttribute("type")).toBe("button");
    expect($("button").hasAttribute("aria-pressed")).toBe(false);
    expect(framed($("button"))).toBe(true);
  });

  it("says whether it is selected", () => {
    render(<HoloButton pressed>Todas</HoloButton>);
    expect($("button").getAttribute("aria-pressed")).toBe("true");
    render(<HoloButton pressed={false}>Todas</HoloButton>);
    expect($("button").getAttribute("aria-pressed")).toBe("false");
  });

  it("does not answer when disabled", () => {
    const onClick = vi.fn();
    render(<HoloButton disabled onClick={onClick}>Salvar</HoloButton>);
    act(() => $("button").click());
    expect(onClick).not.toHaveBeenCalled();
  });

  it("submits a form only when asked to", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <HoloButton>Cancelar</HoloButton>
        <HoloButton type="submit">Enviar</HoloButton>
      </form>,
    );
    const [cancel, submit] = container.querySelectorAll("button");
    act(() => cancel.click());
    expect(onSubmit).not.toHaveBeenCalled();
    act(() => submit.click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("with an icon only, takes its name from the label", () => {
    render(<HoloIconButton label="Fechar"><svg aria-hidden="true" /></HoloIconButton>);
    expect(nameOf($("button"))).toBe("Fechar");
  });
});

describe("HoloLink and BeamLink", () => {
  it("are links with a target, named by their text", () => {
    render(<HoloLink href="/en/career" aria-current="page">Career</HoloLink>);
    expect($("a").getAttribute("href")).toBe("/en/career");
    expect($("a").getAttribute("aria-current")).toBe("page");
    expect(nameOf($("a"))).toBe("Career");
    expect(framed($("a"))).toBe(true);
  });

  it("disabled: still says what it is, but goes nowhere and takes no focus", () => {
    render(<HoloLink href="/en/soon" disabled>Em breve</HoloLink>);
    expect($("a").hasAttribute("href")).toBe(false);
    expect($("a").getAttribute("aria-disabled")).toBe("true");
    expect($("a").getAttribute("role")).toBe("link");
    expect($("a").hasAttribute("tabindex")).toBe(false);
  });

  it("inside running text there is no frame", () => {
    render(<p>Veja <BeamLink href="/en/projects">os projetos</BeamLink>.</p>);
    expect(nameOf($("a"))).toBe("os projetos");
    expect(framed(container)).toBe(false);
  });
});

describe("HoloTag", () => {
  it("leads to its section and marks the one on screen", () => {
    render(
      <>
        <HoloTag href="#sobre" place="section">Sobre mim</HoloTag>
        <HoloTag href="#casos" current>Casos de sucesso</HoloTag>
      </>,
    );
    const [about, cases] = container.querySelectorAll("a");
    expect([nameOf(about), about.getAttribute("href"), about.hasAttribute("aria-current")]).toEqual(["Sobre mim", "#sobre", false]);
    expect([nameOf(cases), cases.getAttribute("aria-current")]).toEqual(["Casos de sucesso", "location"]);
  });
});

describe("HoloCard and HoloScreen", () => {
  it("have one target, named by the title, inside a heading", () => {
    render(
      <HoloCard title="Dermagenix" href="/en/projects/dermagenix" heading="h2">
        <p>Da gravação à prescrição.</p>
      </HoloCard>,
    );
    expect(container.querySelectorAll("a, button").length).toBe(1);
    expect(nameOf($("h2 a"))).toBe("Dermagenix");
    expect($("h2 a").getAttribute("href")).toBe("/en/projects/dermagenix");
    expect(framed($("article"))).toBe(true);
  });

  it("can do something instead of going somewhere", () => {
    const onClick = vi.fn();
    render(<HoloCard title="Nectar CRM" onClick={onClick} />);
    expect(nameOf($("h3 button"))).toBe("Nectar CRM");
    act(() => $("h3 button").click());
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("the screen keeps the image's own text", () => {
    render(
      // eslint-disable-next-line @next/next/no-img-element
      <HoloScreen title="SenseVox" href="/x" media={<img src="/x.webp" alt="Painel de chamadas" width={640} height={360} />}>
        <p>Produção em piloto.</p>
      </HoloScreen>,
    );
    expect($("img").getAttribute("alt")).toBe("Painel de chamadas");
    expect(nameOf($("a"))).toBe("SenseVox");
  });
});

describe("HoloField", () => {
  it("is named by its visible label and described by hint and error", () => {
    render(<HoloField label="E-mail" hint="Só para responder." error="Falta o @." type="email" name="email" />);
    const input = $<HTMLInputElement>("input");
    expect(nameOf(input)).toBe("E-mail");
    expect(input.type).toBe("email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const described = input.getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id)!.textContent);
    expect(described).toEqual(["Só para responder.", "Falta o @."]);
  });

  it("announces an error that appears, and drops it with the error", () => {
    render(<HoloField label="Nome" />);
    const region = $('[role="alert"]');
    expect(region.textContent).toBe("");
    expect($("input").hasAttribute("aria-invalid")).toBe(false);
    expect($("input").hasAttribute("aria-describedby")).toBe(false);
    render(<HoloField label="Nome" error="Diga seu nome." />);
    expect($('[role="alert"]')).toBe(region);
    expect(region.textContent).toBe("Diga seu nome.");
  });

  it("keeps what was typed when the error appears", () => {
    render(<HoloField label="Nome" multiline />);
    const area = $<HTMLTextAreaElement>("textarea");
    area.value = "Olá";
    render(<HoloField label="Nome" multiline error="Curto demais." />);
    expect($<HTMLTextAreaElement>("textarea")).toBe(area);
    expect(area.value).toBe("Olá");
  });
});

describe("HoloSwitch", () => {
  it("is a switch named by its label, and tells its state", () => {
    const onCheckedChange = vi.fn();
    render(<HoloSwitch label="Aberto a vagas" checked={false} onCheckedChange={onCheckedChange} />);
    const button = $("button");
    expect(button.getAttribute("role")).toBe("switch");
    expect(nameOf(button)).toBe("Aberto a vagas");
    expect(button.getAttribute("aria-checked")).toBe("false");
    act(() => button.click());
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    render(<HoloSwitch label="Aberto a vagas" checked disabled onCheckedChange={onCheckedChange} />);
    act(() => $("button").click());
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
  });
});

describe("HoloTabs", () => {
  const tabs = ["Agenda", "Cobrar", "Aconteceu"].map((label) => ({
    id: label.toLowerCase(),
    label,
    content: <p>{`conteúdo de ${label}`}</p>,
  }));
  const tabNamed = (name: string) =>
    [...container.querySelectorAll<HTMLElement>('[role="tab"]')].find((tab) => nameOf(tab) === name)!;
  const shown = () => {
    const panel = $('[role="tabpanel"]');
    return [nameOf(panel), panel.textContent];
  };

  it("names the list, the tabs and the panel, with one tab stop in the list", () => {
    render(<HoloTabs label="Próximos passos" tabs={tabs} />);
    expect(nameOf($('[role="tablist"]'))).toBe("Próximos passos");
    expect(shown()).toEqual(["Agenda", "conteúdo de Agenda"]);
    expect([...container.querySelectorAll<HTMLElement>('[role="tab"]')].map((t) => [t.tabIndex, t.getAttribute("aria-selected")])).toEqual([
      [0, "true"],
      [-1, "false"],
      [-1, "false"],
    ]);
    expect($('[role="tab"]').getAttribute("aria-controls")).toBe($('[role="tabpanel"]').id);
    expect($('[role="tabpanel"]').tabIndex).toBe(0);
  });

  it("moves and selects with arrows, Home and End, and wraps around", () => {
    const onChange = vi.fn();
    render(<HoloTabs label="Próximos passos" tabs={tabs} onChange={onChange} />);
    const steps: [string, string][] = [
      ["ArrowRight", "Cobrar"],
      ["ArrowRight", "Aconteceu"],
      ["ArrowRight", "Agenda"],
      ["ArrowLeft", "Aconteceu"],
      ["Home", "Agenda"],
      ["End", "Aconteceu"],
    ];
    act(() => tabNamed("Agenda").focus());
    for (const [key, name] of steps) {
      press(document.activeElement!, key);
      expect(document.activeElement).toBe(tabNamed(name));
      expect(shown()).toEqual([name, `conteúdo de ${name}`]);
    }
    expect(onChange.mock.calls.flat()).toEqual(["cobrar", "aconteceu", "agenda", "aconteceu", "agenda", "aconteceu"]);
    press(document.activeElement!, "a");
    expect(shown()[0]).toBe("Aconteceu");
  });

  it("selects by click, and starts where it is told", () => {
    render(<HoloTabs label="x" tabs={tabs} defaultTab="cobrar" />);
    expect(shown()[0]).toBe("Cobrar");
    act(() => tabNamed("Agenda").click());
    expect(shown()[0]).toBe("Agenda");
  });

  it("has nothing to show without tabs", () => {
    render(<HoloTabs label="x" tabs={[]} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("HoloDialog", () => {
  /* jsdom has no showModal/close; this is their contract, without the top layer. */
  beforeEach(() => {
    const proto = HTMLDialogElement.prototype;
    proto.showModal = function () {
      this.open = true;
      this.querySelector<HTMLElement>("button")?.focus();
    };
    proto.close = function () {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  });

  let opened: boolean;
  function Case({ onClose }: { onClose?: () => void }) {
    const [open, setOpen] = useState(false);
    opened = open;
    return (
      <>
        <button id="opener" onClick={() => setOpen(true)}>abrir</button>
        <HoloDialog
          open={open}
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
          title="Nectar CRM"
          closeLabel="Fechar"
        >
          <a href="#x">um link</a>
          <button id="last">Entendi</button>
        </HoloDialog>
      </>
    );
  }

  const open = () => {
    act(() => {
      $("#opener").focus();
      $("#opener").click();
    });
    expect($<HTMLDialogElement>("dialog").open).toBe(true);
  };
  const closedAndBack = () => {
    expect(opened).toBe(false);
    expect($<HTMLDialogElement>("dialog").open).toBe(false);
    expect(document.activeElement).toBe($("#opener"));
  };
  const outside = (type: string, target: Element) =>
    act(() => {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true }));
    });

  it("is named by its title and has a named close button", () => {
    render(<Case />);
    open();
    expect(nameOf($("dialog"))).toBe("Nectar CRM");
    expect([...container.querySelectorAll("dialog button")].map(nameOf)).toContain("Fechar");
  });

  it("closes with Esc and gives the focus back", () => {
    render(<Case />);
    open();
    const cancel = new Event("cancel", { cancelable: true });
    act(() => {
      $("dialog").dispatchEvent(cancel);
    });
    expect(cancel.defaultPrevented).toBe(true); // the state closes it, not the element
    closedAndBack();
  });

  it("closes with its button and gives the focus back", () => {
    render(<Case />);
    open();
    act(() => $('dialog button[aria-label="Fechar"]').click());
    closedAndBack();
  });

  it("closes with a click outside, and only with a whole one", () => {
    const onClose = vi.fn();
    render(<Case onClose={onClose} />);
    open();
    const dialog = $("dialog");
    outside("pointerdown", $("#last"));
    outside("click", $("#last"));
    outside("pointerdown", $("#last")); // a selection that ends outside
    outside("click", dialog);
    expect(onClose).not.toHaveBeenCalled();
    outside("pointerdown", dialog);
    outside("click", dialog);
    closedAndBack();
  });

  it("follows the browser when it closes on its own", () => {
    render(<Case />);
    open();
    act(() => $<HTMLDialogElement>("dialog").close());
    closedAndBack();
  });

  it("ignores the late `close` of a previous opening", () => {
    render(<Case />);
    open();
    act(() => {
      $("dialog").dispatchEvent(new Event("close"));
    });
    expect(opened).toBe(true);
    expect($<HTMLDialogElement>("dialog").open).toBe(true);
  });

  it("keeps Tab inside, in both directions", () => {
    render(<Case />);
    open();
    const close = $('dialog button[aria-label="Fechar"]');
    const last = $("#last");
    expect(document.activeElement).toBe(close);
    press(close, "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
    press(last, "Tab");
    expect(document.activeElement).toBe(close);
    // In the middle, the browser moves the focus.
    const tab = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    $("dialog a").focus();
    act(() => {
      $("dialog a").dispatchEvent(tab);
    });
    expect(tab.defaultPrevented).toBe(false);
  });

  it("gives the focus back when it is removed while open", () => {
    function Page() {
      const [there, setThere] = useState(true);
      const [isOpen, setOpen] = useState(false);
      return (
        <>
          <button id="opener" onClick={() => setOpen(true)}>abrir</button>
          {there && (
            <HoloDialog open={isOpen} onClose={() => setOpen(false)} title="x" closeLabel="Fechar">
              <button id="leave" onClick={() => setThere(false)}>sair</button>
            </HoloDialog>
          )}
        </>
      );
    }
    render(<Page />);
    open();
    act(() => $("#leave").click());
    expect(container.querySelector("dialog")).toBeNull();
    expect(document.activeElement).toBe($("#opener"));
  });

  it("renders nothing inside while closed", () => {
    render(<Case />);
    expect($("dialog").childElementCount).toBe(0);
  });
});

describe("HoloNotice", () => {
  it("is announced, at once when it is an error", () => {
    render(<HoloNotice title="Projeto salvo" tone="ok" />);
    expect($("[data-tone]").getAttribute("role")).toBe("status");
    render(<HoloNotice title="Não foi possível salvar" tone="bad" />);
    expect($("[data-tone]").getAttribute("role")).toBe("alert");
  });

  it("is content: without a button there is no hologram in it", () => {
    render(<HoloNotice title="Projeto salvo" />);
    expect(framed(container)).toBe(false);
    render(<HoloNotice title="Projeto salvo" onDismiss={() => {}} dismissLabel="Dispensar" />);
    expect(framed($("button"))).toBe(true);
    expect(framed(container)).toBe(true);
  });

  it("can be dismissed by a named button", () => {
    const onDismiss = vi.fn();
    render(<HoloNotice title="x" onDismiss={onDismiss} dismissLabel="Dispensar" />);
    expect(nameOf($("button"))).toBe("Dispensar");
    act(() => $("button").click());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("leaves on its own, but not while someone is on it", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<HoloNotice title="x" onDismiss={onDismiss} dismissLabel="Dispensar" duration={5000} />);
    act(() => vi.advanceTimersByTime(4000));
    act(() => $("button").focus());
    act(() => vi.advanceTimersByTime(60000));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => $("button").blur());
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stays while the focus is on it, even if the pointer comes and goes", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<HoloNotice title="x" onDismiss={onDismiss} dismissLabel="Dispensar" duration={5000} />);
    // React's enter and leave come from these two.
    const pointer = (type: "pointerover" | "pointerout") =>
      act(() => {
        $("[data-tone]").dispatchEvent(new PointerEvent(type, { bubbles: true, relatedTarget: document.body }));
      });
    act(() => $("button").focus());
    pointer("pointerover");
    pointer("pointerout");
    act(() => vi.advanceTimersByTime(60000));
    expect(onDismiss).not.toHaveBeenCalled();

    pointer("pointerover");
    act(() => $("button").blur());
    act(() => vi.advanceTimersByTime(60000));
    expect(onDismiss).not.toHaveBeenCalled();
    pointer("pointerout");
    act(() => vi.advanceTimersByTime(5000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("stays when it has no duration", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<HoloNotice title="x" onDismiss={onDismiss} dismissLabel="Dispensar" />);
    act(() => vi.advanceTimersByTime(600000));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe("textOf", () => {
  it("finds the text under any markup", () => {
    expect(textOf("Falar comigo")).toBe("Falar comigo");
    expect(textOf(<><b>Falar</b> {"comigo"} {2}</>)).toBe("Falar comigo 2");
    expect(textOf([<svg key="i" />, " Buscar", null, false])).toBe(" Buscar");
  });
});
