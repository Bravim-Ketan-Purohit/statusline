#!/usr/bin/env node
/**
 * Assembles the deployable site into dist-site/.
 *
 *   /            the landing page          (www/index.html)
 *   /docs        the documentation         (www/docs.html)
 *   /app/        the visual builder        (vite build of packages/web)
 *   /assets/     screenshots and video     (curated from landing-kit)
 *
 * The builder is built with --base=/app/ because its entry emits absolute
 * asset URLs; without the override every /assets/*.js 404s under a sub-path.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { docsPage } from "./render-docs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "dist-site");
const KIT = path.join(ROOT, "landing-kit", "assets");

const log = (s) => process.stdout.write(`  ${s}\n`);
const copyDir = (from, to, filter = () => true) => {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, e.name), d = path.join(to, e.name);
    if (e.isDirectory()) n += copyDir(s, d, filter);
    else if (filter(e.name)) { fs.copyFileSync(s, d); n++; }
  }
  return n;
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

/* 1 — the builder, mounted at /app/ */
log("building the visual builder …");
execFileSync(
  path.join(ROOT, "packages/web/node_modules/.bin/vite"),
  ["build", "--base=/app/", "--outDir", path.join(OUT, "app"), "--emptyOutDir"],
  { cwd: path.join(ROOT, "packages/web"), stdio: ["ignore", "pipe", "inherit"] }
);
log(`app  -> dist-site/app (${fs.readdirSync(path.join(OUT, "app", "assets")).length} assets)`);

/* 2 — the static pages. {{MEDIA}} is rewritten to wherever the demo video
      lives; see site.config.json. Keeping it a token means switching hosts
      later is a one-line change, not a find-and-replace across the markup. */
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
let pages = 0;
for (const f of fs.readdirSync(path.join(ROOT, "www"))) {
  const src = path.join(ROOT, "www", f);
  if (f.endsWith(".html")) {
    const html = fs.readFileSync(src, "utf8").replaceAll("{{MEDIA}}", cfg.mediaBase);
    fs.writeFileSync(path.join(OUT, f), html);
    pages++;
  } else if (/\.(svg|txt|xml|ico|png|webmanifest)$/.test(f)) {
    fs.copyFileSync(src, path.join(OUT, f));
    pages++;
  }
}
/* docs.html is generated from docs/*.md so the site cannot drift from them */
/* written as docs/index.html, not docs.html: a directory index resolves on
   every static host, where a bare .html needs the host's cleanUrls setting. */
fs.mkdirSync(path.join(OUT, "docs"), { recursive: true });
fs.writeFileSync(
  path.join(OUT, "docs", "index.html"),
  docsPage(
    fs.readFileSync(path.join(ROOT, "docs/GUIDE.md"), "utf8"),
    fs.readFileSync(path.join(ROOT, "docs/REFERENCE.md"), "utf8")
  )
);
pages++;

log(`pages -> dist-site/ (${pages}), media base ${cfg.mediaBase.replace(/^https:\/\/github\.com\//, "gh:")}`);

/* 3 — stills only. The .mp4 demos are served from a GitHub Release rather
       than committed, so they are deliberately NOT copied here: on Vercel the
       checkout will not contain them at all, and the build must succeed
       anyway. Posters stay local because they are what paints before the
       remote video arrives. */
if (fs.existsSync(KIT)) {
  const stills = (n) => /\.(jpg|png|svg)$/i.test(n);
  const n1 = copyDir(path.join(KIT, "video"), path.join(OUT, "assets/video"), stills);
  const n2 = copyDir(path.join(KIT, "screenshots"), path.join(OUT, "assets/screenshots"), stills);
  const n3 = copyDir(path.join(KIT, "terminal"), path.join(OUT, "assets/terminal"), stills);
  log(`stills -> dist-site/assets (${n1 + n2 + n3} files; video is remote)`);
}

/* 4 — report */
const du = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => {
  const p = path.join(d, e.name);
  return t + (e.isDirectory() ? du(p) : fs.statSync(p).size);
}, 0);
const mb = (b) => (b / 1024 / 1024).toFixed(1) + " MB";
log("");
log(`total   ${mb(du(OUT))}`);
for (const d of ["app", "assets"]) {
  const p = path.join(OUT, d);
  if (fs.existsSync(p)) log(`  ${d.padEnd(7)} ${mb(du(p))}`);
}
