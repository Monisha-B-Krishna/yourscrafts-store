import type { ClientEventName } from "./events";

/**
 * Browser-side event tracking. A session is a random id kept in localStorage
 * that resets after 30 minutes of inactivity. Nothing personal is sent.
 */

const SESSION_KEY = "ycw_sid";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let memorySessionId: string | null = null;

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getSessionId(): string {
  try {
    const now = Date.now();
    const stored = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? "null") as {
      id?: unknown;
      t?: unknown;
    } | null;
    const id =
      stored && typeof stored.id === "string" && typeof stored.t === "number" && now - stored.t < SESSION_TIMEOUT_MS
        ? stored.id
        : newSessionId();
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ id, t: now }));
    return id;
  } catch {
    memorySessionId ??= newSessionId();
    return memorySessionId;
  }
}

export function track(
  eventName: ClientEventName,
  options: { productId?: string | null; metadata?: Record<string, unknown> } = {},
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      session_id: getSessionId(),
      event_name: eventName,
      product_id: options.productId ?? null,
      metadata: options.metadata ?? {},
    });
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never break the shop.
  }
}
