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
    window.alert(`${unsupportedBrowser} detected. ${EXTERNAL_BROWSER_LOGIN_MESSAGE}`);
    return;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}
