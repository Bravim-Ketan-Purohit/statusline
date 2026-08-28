import { build } from "esbuild";
import { chmodSync } from "node:fs";

/**
 * Bundle to a single file. Node resolves ~60 modules otherwise (46 tiles plus
 * zod), and that resolution is most of the warm render time on a command that
 * runs on every message.
 */
await build({
  entryPoints: ["dist/index.js"],
  outfile: "dist/statusline.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  minify: true,
  // No banner: the entry already carries a hashbang and esbuild hoists it.
  // Adding one here emitted it twice and produced a syntax error at line 2.
  // The detached refresh re-invokes this same file, so keep it self-contained.
  external: [],
});
chmodSync("dist/statusline.js", 0o755);
console.log("bundled -> dist/statusline.js");
