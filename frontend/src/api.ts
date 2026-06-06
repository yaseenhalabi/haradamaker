import { supabase } from "./supabase.ts";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export interface ApiBoard {
  id: string;
  owner_id: string;
  title: string;
  cells: Record<string, string>;
  done: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface ShareLink {
  token: string;
  url: string;
}

async function accessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in required");
  return token;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authenticated) {
    headers.set("Authorization", `Bearer ${await accessToken()}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const data = await response.json();
      message = data.detail ?? message;
    } catch {
      // Keep the status-based fallback.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  listBoards: () => request<ApiBoard[]>("/api/boards"),
  createBoard: (payload: {
    title?: string;
    cells: Record<string, string>;
    done: Record<string, boolean>;
  }) =>
    request<ApiBoard>("/api/boards", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateBoard: (goal: string) =>
    request<ApiBoard>("/api/boards/generate", {
      method: "POST",
      body: JSON.stringify({ goal }),
    }),
  updateBoard: (
    id: string,
    payload: {
      title?: string;
      cells?: Record<string, string>;
      done?: Record<string, boolean>;
    },
  ) =>
    request<ApiBoard>(`/api/boards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getBoard: (id: string) => request<ApiBoard>(`/api/boards/${id}`),
  deleteBoard: (id: string) =>
    request<void>(`/api/boards/${id}`, { method: "DELETE" }),
  createShare: (id: string) =>
    request<ShareLink>(`/api/boards/${id}/share`, { method: "POST" }),
  getSharedBoard: (token: string) =>
    request<ApiBoard>(`/api/share/${encodeURIComponent(token)}`, {}, false),
};
