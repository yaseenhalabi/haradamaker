// Two "pages" in the same route, toggled by a sliding switch above the board:
//   - edit: cells are editable (the default).
//   - view: read-only — cells can't be focused or typed into, but the board can
//     still be panned/zoomed for reading.
// No routing; this just flips a mode class and the cells' editability.

export type Mode = "edit" | "view";

// Builds the switch element and returns it so the caller can place it in the
// layout. Wires it up to toggle editing on the given viewport's cells.
export function createModeSwitch(viewport: HTMLElement): HTMLElement {
  const sw = document.createElement("div");
  sw.className = "mode-switch";
  sw.setAttribute("role", "tablist");
  sw.innerHTML = `
    <div class="mode-switch__thumb" aria-hidden="true"></div>
    <button class="mode-switch__option is-active" type="button" role="tab" data-mode="edit">Edit</button>
    <button class="mode-switch__option" type="button" role="tab" data-mode="view">View</button>
  `;

  const options = Array.from(
    sw.querySelectorAll<HTMLButtonElement>(".mode-switch__option"),
  );
  const texts = Array.from(
    viewport.querySelectorAll<HTMLElement>(".cell-text"),
  );

  function setMode(mode: Mode) {
    const editing = mode === "edit";
    sw.classList.toggle("is-view", !editing);
    viewport.classList.toggle("mode-view", !editing);
    // Drives the sidebar layout (visible in Edit, hidden in View). Also close
    // any open mobile sidebar overlay when leaving Edit mode.
    document.body.classList.toggle("mode-view", !editing);
    if (!editing) document.body.classList.remove("sidebar-open");
    for (const opt of options) {
      opt.classList.toggle("is-active", opt.dataset.mode === mode);
      opt.setAttribute("aria-selected", String(opt.dataset.mode === mode));
    }
    // Hard-disable editing in view mode (CSS already blocks taps; this also
    // stops any programmatic focus / the on-screen keyboard).
    for (const t of texts) {
      t.setAttribute("contenteditable", editing ? "plaintext-only" : "false");
    }
    if (!editing) (document.activeElement as HTMLElement | null)?.blur?.();
  }

  for (const opt of options) {
    opt.addEventListener("click", () => setMode(opt.dataset.mode as Mode));
  }

  setMode("edit");
  return sw;
}
