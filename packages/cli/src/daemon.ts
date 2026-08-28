import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { CONFIG_DIR, DAEMON_PATH } from "./paths.js";
import { dispatch, isAction, backend, ACTIONS } from "./actions.js";

/**
 * This exists only because Claude Code cannot dispatch a command: its status
 * line is captured stdout, so the one interactive primitive is an OSC 8 link,
 * which needs something listening. tmux needs none of this.
 *
 * It runs commands in response to HTTP, so: loopback only, token required,
 * fixed allowlist, never a command string from the URL.
 */
export interface DaemonFile { token: string; port: number }

export function loadOrCreateToken(port: number): DaemonFile {
  if (existsSync(DAEMON_PATH)) {
    try {
      const d = JSON.parse(readFileSync(DAEMON_PATH, "utf8")) as DaemonFile;
      if (d.token) return { token: d.token, port: d.port ?? port };
    } catch { /* regenerate below */ }
  }
  const d: DaemonFile = { token: randomBytes(24).toString("hex"), port };
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(DAEMON_PATH, JSON.stringify(d, null, 2) + "\n", { mode: 0o600 });
  return d;
}

function tokenMatches(a: string, b: string): boolean {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function actionUrl(port: number, token: string, id: string): string {
  return `http://127.0.0.1:${port}/action/${encodeURIComponent(id)}?t=${token}`;
}

export function startDaemon(port: number): Promise<void> {
  const { token } = loadOrCreateToken(port);
  const server = createServer((req, res) => {
    const end = (code: number, body = "") => {
      res.writeHead(code, { "content-type": "text/plain", "cache-control": "no-store" });
      res.end(body);
    };
    try {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
      if (url.pathname === "/health") return end(200, "ok");

      const m = /^\/action\/([a-z_]{1,15})$/.exec(url.pathname);
      if (!m) return end(404);

      const supplied = url.searchParams.get("t") ?? "";
      if (!supplied || !tokenMatches(supplied, token)) return end(403);

      const id = m[1]!;
      if (!isAction(id)) return end(400, `unknown action; allowed: ${ACTIONS.join(", ")}`);

      const r = dispatch(id);
      // 204 so the tab the terminal opened closes without painting anything.
      return end(r.ok ? 204 : 500, r.ok ? "" : r.detail);
    } catch {
      return end(500);
    }
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    // 127.0.0.1 explicitly. Never 0.0.0.0.
    server.listen(port, "127.0.0.1", () => {
      const b = backend();
      process.stderr.write(`statusline daemon on http://127.0.0.1:${port} (loopback only)\n`);
      process.stderr.write(`  token stored 0600 at ${DAEMON_PATH}\n`);
      process.stderr.write(`  media backend: ${b ?? "none detected — media actions will 500"}\n`);
      process.stderr.write(`  allowlist: ${ACTIONS.join(", ")}\n`);
      resolve();
    });
  });
}
