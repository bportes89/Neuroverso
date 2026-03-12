import { getApiBaseUrl } from "./api";
import { getToken } from "./auth";

export type SseMessage = {
  event?: string;
  data: string;
};

export type StreamEvent = {
  scope: "job" | "run";
  scopeId: string;
  ts: string;
  type: string;
  message?: string;
  data?: unknown;
};

export function connectSse(path: string, onEvent: (ev: StreamEvent) => void): () => void {
  const token = getToken();
  if (!token) throw new Error("Sem token");

  const controller = new AbortController();

  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`;
  void (async () => {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "text/event-stream",
        authorization: `Bearer ${token}`
      },
      signal: controller.signal
    });

    if (!res.ok || !res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let currentEvent: string | undefined;
    let currentData: string[] = [];

    const flush = () => {
      if (currentData.length === 0) return;
      const raw = currentData.join("\n");
      currentData = [];
      try {
        const parsed = JSON.parse(raw);
        onEvent(parsed as StreamEvent);
      } catch {
        onEvent({ scope: "run", scopeId: "unknown", ts: new Date().toISOString(), type: currentEvent ?? "message", message: raw });
      }
      currentEvent = undefined;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const idx = buffer.indexOf("\n");
        if (idx === -1) break;
        const line = buffer.slice(0, idx).replace(/\r$/, "");
        buffer = buffer.slice(idx + 1);

        if (line === "") {
          flush();
          continue;
        }

        if (line.startsWith("event:")) {
          currentEvent = line.slice("event:".length).trim();
          continue;
        }

        if (line.startsWith("data:")) {
          currentData.push(line.slice("data:".length).trim());
          continue;
        }
      }
    }
  })();

  return () => controller.abort();
}

