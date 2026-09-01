#!/usr/bin/env node
/** Confirms every remote media URL the built site references actually resolves. */
import fs from "node:fs";
import path from "node:path";

const cfg = JSON.parse(fs.readFileSync("site.config.json", "utf8"));
const OUT = "dist-site";
if (!fs.existsSync(OUT)) { console.error("dist-site/ not built. Run: pnpm build:site"); process.exit(1); }

const urls = new Set();
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.html$/.test(e.name)) {
      const html = fs.readFileSync(p, "utf8");
      for (const m of html.matchAll(/https:\/\/github\.com\/[^"')\s]+\.mp4/g)) urls.add(m[0]);
    }
  }
};
walk(OUT);

if (!urls.size) { console.log("  no remote media referenced yet (landing page still a placeholder)"); process.exit(0); }

let bad = 0;
for (const u of [...urls].sort()) {
  const r = await fetch(u, { method: "HEAD", redirect: "follow" }).catch((e) => ({ ok: false, status: e.message }));
  const size = r.headers?.get?.("content-length");
  console.log(`  ${r.ok ? "OK  " : "FAIL"} ${r.status}  ${size ? (size/1024/1024).toFixed(1).padStart(5) + " MB" : "     "}  ${u.split("/").pop()}`);
  if (!r.ok) bad++;
}
console.log(bad ? `\n  ${bad} URL(s) unreachable — run: pnpm media:publish` : `\n  all ${urls.size} media URLs resolve`);
process.exit(bad ? 1 : 0);
