import { Check, ChevronDown, createElement } from "lucide";

const COLOR_SCHEME_KEY = "haradamaker-color-scheme";

export type ColorScheme = {
  id: string;
  name: string;
  line: string;
  cell: string;
  pillar: string;
  goal: string;
  text: string;
  goalText: string;
};

export const COLOR_SCHEMES = [
  {
    id: "classic",
    name: "Classic",
    line: "#000000",
    cell: "#ffffff",
    pillar: "#d9d9d9",
    goal: "#1f1f1f",
    text: "#000000",
    goalText: "#ffffff",
  },
  {
    id: "paper",
    name: "Paper",
    line: "#4b4037",
    cell: "#fffaf0",
    pillar: "#eadfca",
    goal: "#5f4b32",
    text: "#241f1a",
    goalText: "#fffaf0",
  },
  {
    id: "sage",
    name: "Sage",
    line: "#253a32",
    cell: "#f7fbf7",
    pillar: "#cfe1d6",
    goal: "#315c4a",
    text: "#17231e",
    goalText: "#f7fbf7",
  },
  {
    id: "sky",
    name: "Sky",
    line: "#1d3557",
    cell: "#f8fbff",
    pillar: "#cfe3f6",
    goal: "#255d8f",
    text: "#102033",
    goalText: "#ffffff",
  },
  {
    id: "coral",
    name: "Coral",
    line: "#4f2932",
    cell: "#fff8f6",
    pillar: "#f2c7bd",
    goal: "#a24545",
    text: "#2b171b",
    goalText: "#fff8f6",
  },
] as const satisfies readonly ColorScheme[];

export function getCurrentColorScheme(): ColorScheme {
  const saved = localStorage.getItem(COLOR_SCHEME_KEY);
  return COLOR_SCHEMES.find((scheme) => scheme.id === saved) ?? COLOR_SCHEMES[0];
}

function applyColorScheme(scheme: ColorScheme): void {
  const style = document.body.style;
  style.setProperty("--grid-line", scheme.line);
  style.setProperty("--grid-cell", scheme.cell);
  style.setProperty("--grid-pillar", scheme.pillar);
  style.setProperty("--grid-goal", scheme.goal);
  style.setProperty("--grid-text", scheme.text);
  style.setProperty("--grid-goal-text", scheme.goalText);
}

export function createColorSchemePicker(mount: HTMLElement): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "color-picker";

  const toggle = document.createElement("button");
  toggle.className = "color-picker__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Grid color scheme");
  toggle.title = "Grid color scheme";

  const preview = document.createElement("span");
  preview.className = "color-picker__preview";
  toggle.appendChild(preview);
  toggle.appendChild(createElement(ChevronDown));

  const menu = document.createElement("div");
  menu.className = "color-picker__menu";

  const buttons = new Map<string, HTMLButtonElement>();

  const select = (scheme: ColorScheme) => {
    localStorage.setItem(COLOR_SCHEME_KEY, scheme.id);
    applyColorScheme(scheme);
    preview.innerHTML = "";
    for (const color of [scheme.cell, scheme.pillar, scheme.goal]) {
      const swatch = document.createElement("span");
      swatch.className = "color-picker__preview-swatch";
      swatch.style.background = color;
      preview.appendChild(swatch);
    }
    for (const [id, btn] of buttons) {
      const active = id === scheme.id;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
    }
  };

  for (const scheme of COLOR_SCHEMES) {
    const btn = document.createElement("button");
    btn.className = "color-picker__item";
    btn.type = "button";
    btn.setAttribute("role", "menuitemradio");

    const swatches = document.createElement("span");
    swatches.className = "color-picker__swatches";
    for (const color of [scheme.cell, scheme.pillar, scheme.goal]) {
      const swatch = document.createElement("span");
      swatch.className = "color-picker__swatch";
      swatch.style.background = color;
      swatches.appendChild(swatch);
    }

    const name = document.createElement("span");
    name.className = "color-picker__name";
    name.textContent = scheme.name;

    const check = createElement(Check);
    check.classList.add("color-picker__check");

    btn.appendChild(swatches);
    btn.appendChild(name);
    btn.appendChild(check);
    btn.addEventListener("click", () => {
      select(scheme);
      close();
    });
    buttons.set(scheme.id, btn);
    menu.appendChild(btn);
  }

  const close = () => wrap.classList.remove("is-open");

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    wrap.classList.toggle("is-open");
  });
  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target as Node)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });

  wrap.appendChild(toggle);
  wrap.appendChild(menu);
  mount.appendChild(wrap);
  select(getCurrentColorScheme());
  return wrap;
}
