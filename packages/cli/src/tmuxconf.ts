import { tmuxConfSnippet, type Config } from "@statusline/core";

export function printTmuxConf(cfg: Config) {
  process.stdout.write(tmuxConfSnippet(cfg) + "\n");
}
