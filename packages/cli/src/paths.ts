import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_DIR = join(homedir(), ".config", "statusline");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");
export const CREDENTIALS_PATH = join(CONFIG_DIR, "credentials.json");
export const DAEMON_PATH = join(CONFIG_DIR, "daemon.json");
export const CLAUDE_SETTINGS = join(homedir(), ".claude", "settings.json");
