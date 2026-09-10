import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Node 20 has no native WebSocket. Scripts only use REST, not realtime. */
function ensureScriptWebSocket() {
  if (typeof globalThis.WebSocket !== "undefined") return;

  class ScriptWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = ScriptWebSocket.CLOSED;
    bufferedAmount = 0;
    extensions = "";
    protocol = "";
    url = "";
    binaryType = "blob";
    onopen: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onmessage: ((event: MessageEvent) => void) | null = null;
    constructor(url: string) {
      this.url = url;
    }
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false;
    }
  }

  globalThis.WebSocket = ScriptWebSocket as unknown as typeof WebSocket;
}

ensureScriptWebSocket();

export function loadEnvFiles() {
  ensureScriptWebSocket();
  const candidates = [
    path.resolve(process.cwd(), ".env.local"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env.local"),
    path.resolve(process.cwd(), "../.env"),
  ];

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
