import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { CONFIG_DIR, CREDENTIALS_PATH } from "./paths.js";

/**
 * Credentials.
 *
 * Two rules. They live in their own file, never in config.json, because
 * config.json is the thing the builder hands you to paste into a chat. And
 * they are handed to producers only -- a tile never sees a token, so a token
 * can never reach a span and therefore never reach the terminal.
 */

let warned = false;

export function readCredentials(): Record<string, string> {
  try {
    if (!existsSync(CREDENTIALS_PATH)) return {};
    const mode = statSync(CREDENTIALS_PATH).mode & 0o777;
    if (mode & 0o077) {
      if (!warned) {
        warned = true;
        process.stderr.write(
          `statusline: ${CREDENTIALS_PATH} is mode ${mode.toString(8)} and readable by others; ` +
          `refusing to load it. Run: chmod 600 ${CREDENTIALS_PATH}\n`);
      }
      return {};
    }
    const v = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "string") out[k] = val;
    }
    return out;
  } catch { return {}; }
}

export function setCredential(name: string, value: string) {
  const cur = existsSync(CREDENTIALS_PATH) ? readCredentialsRaw() : {};
  cur[name] = value;
  mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(cur, null, 2) + "\n", { mode: 0o600 });
}

function readCredentialsRaw(): Record<string, string> {
  try {
    const v = JSON.parse(readFileSync(CREDENTIALS_PATH, "utf8"));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch { return {}; }
}

export function deleteCredential(name: string): boolean {
  const cur = readCredentialsRaw();
  if (!(name in cur)) return false;
  delete cur[name];
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(cur, null, 2) + "\n", { mode: 0o600 });
  return true;
}

/** Names only. A list command must never print a value. */
export function listCredentialNames(): string[] {
  return Object.keys(readCredentialsRaw()).sort();
}
