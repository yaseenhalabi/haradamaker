import { createElement, Menu, X } from "lucide";

// Left sidebar with a short "what is this / how to use" guide.
//   - Edit mode: shown as a fixed-width column to the left of the board (the
//     board sits in the remaining space, off-centre to the right).
//   - View mode: hidden entirely (the board centres on screen).
//   - Mobile: the column collapses; a top-left button slides it in as an overlay
//     above everything, with a backdrop and a close button.
//
// Open/close state lives as a `sidebar-open` class on <body>; visibility per
// mode is driven by the `mode-view` body class (see mode.ts). Appends its
// elements to `mount` and returns nothing — it's self-contained.
export function createSidebar(mount: HTMLElement): void {
  const aside = document.createElement("aside");
  aside.className = "sidebar";
  aside.innerHTML = `
    <h1 class="sidebar__title">HaradaMaker.com</h1>
    <div class="sidebar__meta">
      <span>
        Made by
        <a
          href="https://www.linkedin.com/in/yaseenhalabi"
          target="_blank"
          rel="noreferrer"
        >Yaseen Halabi</a>
      </span>
      <a
        href="https://github.com/yaseenhalabi/haradamaker"
        target="_blank"
        rel="noreferrer"
      >GitHub</a>
    </div>
    <p class="sidebar__lead">
      A digital Mandal chart for the Harada Method, a goal-setting framework
      developed by Japanese educator Takashi Harada to turn a big ambition into
      concrete, daily action.
    </p>
    <h2 class="sidebar__heading">How the method works</h2>
    <p class="sidebar__lead">
      Write your single main goal in the very centre. Around it, name the eight
      themes you must master to reach it. Each of those themes then becomes the
      centre of its own 3&times;3 block, where you list eight specific actions
      that develop it. That makes 81 boxes in all, building from one goal to 64
      concrete habits you can practise.
    </p>
    <p class="sidebar__lead">
      Baseball star Shohei Ohtani famously made one of these charts in high
      school, with &ldquo;become the no.&nbsp;1 draft pick&rdquo; at its centre,
      surrounded by themes like body, control, and mentality.
    </p>
    <h2 class="sidebar__heading">How to use</h2>
    <ul class="sidebar__list">
      <li>Tap a 3&times;3 block to zoom in, then tap a cell to start typing.</li>
      <li>
        Each outer block feeds one cell of the centre block; those
        mirrored cells stay in sync automatically.
      </li>
      <li>Press <kbd>Enter</kbd> to finish editing a cell.</li>
      <li>Press <kbd>Esc</kbd> to zoom back out.</li>
      <li>On a touchscreen, tap outside the grid to zoom out.</li>
      <li>
        Switch to <strong>View</strong> mode to check off actions as you finish
        them; completed blocks fill in their centre automatically.
      </li>
    </ul>
  `;

  // Close button (mobile overlay only).
  const close = document.createElement("button");
  close.className = "sidebar__close";
  close.type = "button";
  close.setAttribute("aria-label", "Close guide");
  close.appendChild(createElement(X));
  aside.insertBefore(close, aside.firstChild);

  // Open button (mobile only), pinned to the top-left of the screen.
  const toggle = document.createElement("button");
  toggle.className = "sidebar-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Open guide");
  toggle.appendChild(createElement(Menu));

  const backdrop = document.createElement("div");
  backdrop.className = "sidebar-backdrop";

  const open = () => document.body.classList.add("sidebar-open");
  const dismiss = () => document.body.classList.remove("sidebar-open");

  toggle.addEventListener("click", open);
  close.addEventListener("click", dismiss);
  backdrop.addEventListener("click", dismiss);

  mount.appendChild(aside);
  mount.appendChild(toggle);
  mount.appendChild(backdrop);
}
