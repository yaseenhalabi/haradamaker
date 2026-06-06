import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase frontend environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const EXTERNAL_BROWSER_LOGIN_MESSAGE =
  "Log in is not available inside this in-app browser. Open this site in an external browser like Chrome, Safari, or Edge, then log in again.";

function externalBrowserUrl(): string {
  const lower = navigator.userAgent.toLowerCase();
  if (!/android/.test(lower)) return window.location.href;

  const path = `${window.location.pathname}${window.location.search}`;
  const fallback = encodeURIComponent(window.location.href);
  return `intent://${window.location.host}${path}#Intent;scheme=${window.location.protocol.replace(
    ":",
    "",
  )};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

function showExternalBrowserPrompt(browserName: string): void {
  document.querySelector(".external-browser-dialog")?.remove();

  const dialog = document.createElement("div");
  dialog.className = "external-browser-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "external-browser-title");

  const panel = document.createElement("div");
  panel.className = "external-browser-dialog__panel";

  const title = document.createElement("h2");
  title.id = "external-browser-title";
  title.className = "external-browser-dialog__title";
  title.textContent = "Open in external browser";

  const copy = document.createElement("p");
  copy.className = "external-browser-dialog__copy";
  copy.textContent = `${browserName} detected. ${EXTERNAL_BROWSER_LOGIN_MESSAGE}`;

  const actions = document.createElement("div");
  actions.className = "external-browser-dialog__actions";

  const openLink = document.createElement("a");
  openLink.className = "external-browser-dialog__primary";
  openLink.href = externalBrowserUrl();
  openLink.target = "_blank";
  openLink.rel = "noreferrer";
  openLink.textContent = "Open in browser";

  const copyButton = document.createElement("button");
  copyButton.className = "external-browser-dialog__secondary";
  copyButton.type = "button";
  copyButton.textContent = "Copy link";
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyButton.textContent = "Copied";
    } catch {
      window.prompt("Copy this link, then open it in your browser:", window.location.href);
    }
  });

  const closeButton = document.createElement("button");
  closeButton.className = "external-browser-dialog__close";
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "Close";

  const close = () => dialog.remove();
  closeButton.addEventListener("click", close);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  actions.append(openLink, copyButton);
  panel.append(title, copy, actions, closeButton);
  dialog.appendChild(panel);
  document.body.appendChild(dialog);
  openLink.focus();
}

function unsupportedAuthBrowserName(): string | null {
  const ua = navigator.userAgent;
  const lower = ua.toLowerCase();

  const knownInAppBrowsers: Array<[RegExp, string]> = [
    [/linkedinapp|linkedin/i, "LinkedIn"],
    [/instagram/i, "Instagram"],
    [/fban|fbav|fb_iab|facebook/i, "Facebook"],
    [/twitter|x-client/i, "X"],
    [/tiktok/i, "TikTok"],
    [/snapchat/i, "Snapchat"],
    [/pinterest/i, "Pinterest"],
    [/line\//i, "LINE"],
  ];

  for (const [pattern, name] of knownInAppBrowsers) {
    if (pattern.test(ua)) return `${name} in-app browser`;
  }

  const iosWebView =
    /iphone|ipad|ipod/.test(lower) &&
    /applewebkit/.test(lower) &&
    !/safari/.test(lower);
  if (iosWebView) return "in-app browser";

  const androidWebView =
    /android/.test(lower) && (/\bwv\b/.test(lower) || /; wv\)/.test(lower));
  if (androidWebView) return "Android webview";

  return null;
}

export async function signInWithGoogle(): Promise<void> {
  const unsupportedBrowser = unsupportedAuthBrowserName();
  if (unsupportedBrowser) {
    showExternalBrowserPrompt(unsupportedBrowser);
    return;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}
