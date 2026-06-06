import {
  createElement,
  ChevronDown,
  LogIn,
  LogOut,
  Plus,
  CircleAlert,
  RefreshCw,
  Save,
  Share2,
  Trash2,
} from "lucide";
import type { BoardElements } from "./grid.ts";
import { api, type ApiBoard } from "./api.ts";
import { renderDoneState } from "./done.ts";
import { renderBoardCells } from "./edit.ts";
import { boardSnapshot, boardStore } from "./store.ts";
import { signInWithGoogle, supabase } from "./supabase.ts";

const ACTIVE_BOARD_KEY = "haradamaker-active-board-id";
const LOGIN_REQUIRED_MESSAGE = "You need to log in before saving or sharing.";
const UNTITLED_GOAL = "Untitled goal";
const AUTOSAVE_INTERVAL_MS = 2000;

function boardTitle(cells: Record<string, string>): string {
  return (cells["4-4"] ?? "").trim().slice(0, 120) || "Untitled board";
}

function shareUrl(url: string): string {
  return new URL(url, window.location.origin).toString();
}

export function createPersistenceControls(
  mount: HTMLElement,
  elements: BoardElements,
): void {
  let activeBoardId = localStorage.getItem(ACTIVE_BOARD_KEY);
  let applyingRemote = false;
  let autosaveTimer = 0;
  let autosaveInFlight = false;
  let autosaveQueued = false;
  let lastAutosaveStartedAt = 0;

  const wrap = document.createElement("div");
  wrap.className = "cloud";

  const picker = document.createElement("div");
  picker.className = "cloud-picker";
  picker.hidden = true;

  const pickerButton = document.createElement("button");
  pickerButton.className = "cloud-picker__button";
  pickerButton.type = "button";
  pickerButton.setAttribute("aria-haspopup", "menu");
  pickerButton.setAttribute("aria-expanded", "false");

  const pickerLabel = document.createElement("span");
  pickerLabel.className = "cloud-picker__label";
  const pickerLeadingIcon = createElement(Plus);
  pickerLeadingIcon.classList.add("cloud-picker__leading-icon");
  pickerLabel.textContent = "Create new chart";
  pickerButton.append(pickerLeadingIcon, pickerLabel, createElement(ChevronDown));

  const pickerMenu = document.createElement("div");
  pickerMenu.className = "cloud-picker__menu";
  pickerMenu.setAttribute("role", "menu");
  picker.append(pickerButton, pickerMenu);

  const loginButton = document.createElement("button");
  loginButton.className = "cloud__text-button";
  loginButton.type = "button";
  loginButton.append(createElement(LogIn), document.createTextNode("Log in"));

  const logoutButton = document.createElement("button");
  logoutButton.className = "cloud__text-button";
  logoutButton.type = "button";
  logoutButton.append(createElement(LogOut), document.createTextNode("Log out"));
  logoutButton.hidden = true;

  const authSlot = document.createElement("div");
  authSlot.className = "cloud__auth-slot";
  authSlot.append(loginButton, logoutButton);

  const saveButton = document.createElement("button");
  saveButton.className = "cloud__icon-button";
  saveButton.type = "button";
  saveButton.setAttribute("aria-label", "Save");

  const shareButton = document.createElement("button");
  shareButton.className = "cloud__icon-button";
  shareButton.type = "button";
  shareButton.setAttribute("aria-label", "Share");
  shareButton.appendChild(createElement(Share2));

  wrap.append(picker, authSlot, saveButton, shareButton);
  mount.appendChild(wrap);

  function setSaveState(state: "saved" | "saving" | "error" = "saved") {
    saveButton.replaceChildren();
    saveButton.classList.toggle("is-saving", state === "saving");
    saveButton.classList.toggle("is-error", state === "error");
    saveButton.setAttribute(
      "aria-label",
      state === "saving" ? "Saving" : state === "error" ? "Save failed" : "Save",
    );
    const icon =
      state === "saving"
        ? createElement(RefreshCw)
        : state === "error"
          ? createElement(CircleAlert)
          : createElement(Save);
    saveButton.appendChild(icon);
  }
  setSaveState("saved");

  function setSignedInState(signedIn: boolean) {
    loginButton.hidden = signedIn;
    logoutButton.hidden = !signedIn;
  }

  function closePicker() {
    picker.classList.remove("is-open");
    pickerButton.setAttribute("aria-expanded", "false");
  }

  async function createNewHarada() {
    if (!(await signedIn())) return;
    applyingRemote = true;
    setSaveState("saving");
    try {
      const cells = { "4-4": UNTITLED_GOAL };
      const board = await api.createBoard({
        title: UNTITLED_GOAL,
        cells,
        done: {},
      });
      applyBoard(board);
      await refreshBoardList();
    } finally {
      applyingRemote = false;
    }
  }

  function setPickerLabel(label: string, addIcon = false) {
    const currentIcon = pickerButton.querySelector(".cloud-picker__leading-icon");
    currentIcon?.remove();
    if (addIcon) {
      const icon = createElement(Plus);
      icon.classList.add("cloud-picker__leading-icon");
      pickerButton.insertBefore(icon, pickerLabel);
    }
    pickerLabel.textContent = label;
  }

  function clearBoardSelection() {
    applyingRemote = true;
    activeBoardId = null;
    localStorage.removeItem(ACTIVE_BOARD_KEY);
    boardStore.getState().replaceBoard({}, {});
    renderBoardCells(elements.viewport, {});
    renderDoneState(elements.viewport, {});
    setPickerLabel("Create new chart", true);
    setSaveState("saved");
    applyingRemote = false;
  }

  async function deleteHarada(board: ApiBoard) {
    const confirmed = window.confirm(`Delete "${board.title}"?`);
    if (!confirmed) return;

    setSaveState("saving");
    await api.deleteBoard(board.id);
    if (activeBoardId === board.id) clearBoardSelection();
    await refreshBoardList();
    setSaveState("saved");
  }

  function addPickerItem(
    label: string,
    action: () => void,
    active = false,
    addIcon = false,
    board?: ApiBoard,
  ) {
    const item = document.createElement("button");
    item.className = "cloud-picker__item";
    item.type = "button";
    item.setAttribute("role", "menuitem");
    item.classList.toggle("is-active", active);
    const labelWrap = document.createElement("span");
    labelWrap.className = "cloud-picker__item-label";
    if (addIcon) labelWrap.appendChild(createElement(Plus));
    labelWrap.appendChild(document.createTextNode(label));
    item.appendChild(labelWrap);

    if (board) {
      const deleteButton = document.createElement("span");
      deleteButton.className = "cloud-picker__delete";
      deleteButton.setAttribute("role", "button");
      deleteButton.setAttribute("aria-label", `Delete ${board.title}`);
      deleteButton.tabIndex = 0;
      deleteButton.appendChild(createElement(Trash2));
      const onDelete = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteHarada(board).catch((error) => {
          console.error(error);
          setSaveState("error");
        });
      };
      deleteButton.addEventListener("click", onDelete);
      deleteButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") onDelete(event);
      });
      item.appendChild(deleteButton);
    }

    item.addEventListener("click", () => {
      closePicker();
      action();
    });
    pickerMenu.appendChild(item);
  }

  function applyBoard(board: ApiBoard) {
    applyingRemote = true;
    activeBoardId = board.id;
    localStorage.setItem(ACTIVE_BOARD_KEY, board.id);
    boardStore.getState().replaceBoard(board.cells, board.done);
    renderBoardCells(elements.viewport, board.cells);
    renderDoneState(elements.viewport, board.done);
    applyingRemote = false;
    setSaveState("saved");
  }

  async function refreshBoardList() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      picker.hidden = true;
      setSignedInState(false);
      return;
    }

    setSignedInState(true);
    const boards = await api.listBoards();
    if (!activeBoardId && boards.length > 0) {
      applyBoard(boards[0]);
    }
    pickerMenu.replaceChildren();
    addPickerItem("Create new chart", () => {
      createNewHarada().catch((error) => {
        console.error(error);
        setSaveState("error");
      });
    }, false, true);
    for (const board of boards) {
      addPickerItem(
        board.title,
        async () => {
          try {
            const selected = await api.getBoard(board.id);
            applyBoard(selected);
            await refreshBoardList();
          } catch (error) {
            console.error(error);
            setSaveState("error");
          }
        },
        board.id === activeBoardId,
        false,
        board,
      );
      if (board.id === activeBoardId) setPickerLabel(board.title);
    }
    if (!activeBoardId) setPickerLabel("Create new Harada", true);
    picker.hidden = false;
  }

  async function signedIn(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }

  async function ensureBoard(): Promise<string | null> {
    if (!(await signedIn())) return null;
    if (activeBoardId) return activeBoardId;
    setSaveState("saving");
    const snapshot = boardSnapshot();
    const board = await api.createBoard({
      title: boardTitle(snapshot.cells),
      ...snapshot,
    });
    applyBoard(board);
    await refreshBoardList();
    return board.id;
  }

  async function saveNow(): Promise<ApiBoard | null> {
    const boardId = await ensureBoard();
    if (!boardId) return null;
    setSaveState("saving");
    const snapshot = boardSnapshot();
    const board = await api.updateBoard(boardId, {
      title: boardTitle(snapshot.cells),
      ...snapshot,
    });
    setSaveState("saved");
    await refreshBoardList();
    return board;
  }

  function queueAutosave() {
    if (applyingRemote || !activeBoardId) return;
    autosaveQueued = true;
    window.clearTimeout(autosaveTimer);
    const elapsed = Date.now() - lastAutosaveStartedAt;
    const delay = Math.max(0, AUTOSAVE_INTERVAL_MS - elapsed);
    autosaveTimer = window.setTimeout(() => {
      runAutosave();
    }, delay);
  }

  async function runAutosave() {
    if (autosaveInFlight || !autosaveQueued || !activeBoardId) return;
    autosaveQueued = false;
    autosaveInFlight = true;
    lastAutosaveStartedAt = Date.now();
    try {
      await saveNow();
    } catch (error) {
        console.error(error);
        setSaveState("error");
    } finally {
      autosaveInFlight = false;
      if (autosaveQueued) queueAutosave();
    }
  }

  saveButton.addEventListener("click", () => {
    signedIn()
      .then((isSignedIn) => {
        if (!isSignedIn) {
          window.alert(LOGIN_REQUIRED_MESSAGE);
          return null;
        }
        return saveNow();
      })
      .catch((error) => {
        console.error(error);
        setSaveState("error");
      });
  });

  loginButton.addEventListener("click", () => {
    signInWithGoogle().catch((error) => {
      console.error(error);
      setSaveState("error");
    });
  });

  logoutButton.addEventListener("click", () => {
    supabase.auth.signOut().catch((error) => {
      console.error(error);
      setSaveState("error");
    });
  });

  shareButton.addEventListener("click", async () => {
    try {
      if (!(await signedIn())) {
        window.alert(LOGIN_REQUIRED_MESSAGE);
        return;
      }
      const board = await saveNow();
      if (!board) return;
      const link = await api.createShare(board.id);
      const fullUrl = shareUrl(link.url);
      await navigator.clipboard?.writeText(fullUrl);
      setSaveState("saved");
    } catch (error) {
      console.error(error);
      setSaveState("error");
    }
  });

  pickerButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = !picker.classList.contains("is-open");
    picker.classList.toggle("is-open", open);
    pickerButton.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target as Node)) closePicker();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePicker();
  });

  boardStore.subscribe(queueAutosave);

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      activeBoardId = null;
      localStorage.removeItem(ACTIVE_BOARD_KEY);
      picker.hidden = true;
      setSignedInState(false);
      setSaveState("saved");
      return;
    }
    window.setTimeout(async () => {
      try {
        await refreshBoardList();
        setSignedInState(true);
      } catch (error) {
        console.error(error);
        setSaveState("error");
      }
    }, 0);
  });

  supabase.auth.getSession().then(async ({ data }) => {
    setSignedInState(!!data.session);
    if (!data.session) return;
    await refreshBoardList();
  }).catch((error) => {
    console.error(error);
    setSaveState("error");
  });
}
