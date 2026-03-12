import { clearToken, getToken } from "./auth";

export type ApiError = {
  status: number;
  message: string;
  data?: unknown;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:4000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    const message =
      typeof (data as any)?.message === "string"
        ? (data as any).message
        : Array.isArray((data as any)?.message)
          ? (data as any).message.join(", ")
          : typeof (data as any)?.error === "string"
            ? (data as any).error
            : `Erro HTTP ${res.status}`;
    const err: ApiError = { status: res.status, message, data };
    throw err;
  }

  return data as T;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
