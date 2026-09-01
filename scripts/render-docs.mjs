/**
 * Renders docs/GUIDE.md + docs/REFERENCE.md into one page styled like the
 * landing. Generated at build time so the site can't drift from the markdown.
 * Deliberately a small subset of markdown — exactly what these two files use.
 */
import fs from "node:fs";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const REPO_BLOB = "https://github.com/Bravim-Ketan-Purohit/statusline/blob/main/";
/* A relative *.md path is correct inside the repo and a 404 on the site.
   The two files rendered onto this page become anchors; anything else
   points at the file on GitHub. */
function mdHref(href) {
  if (!/\.md(#.*)?$/i.test(href) || /^https?:/i.test(href)) return href;
  const f = href.split("/").pop().toLowerCase();
  if (f.startsWith("reference.md")) return "#reference";
  if (f.startsWith("guide.md")) return "#guide";
  return REPO_BLOB + href.replace(/^\.\//, "");
}

function inline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code style="font-family:\'JetBrains Mono\',monospace;font-size:.88em;background:#f5f2ec;border-radius:2px;padding:2px 5px">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, href) =>
      `<a href="${mdHref(href)}" style="color:#a86a12;text-decoration:underline;text-underline-offset:2px">${t}</a>`);
}

export function mdToHtml(md) {
  const out = [];
  const lines = md.split("\n");
  let i = 0;
  const toc = [];
  while (i < lines.length) {
    const l = lines[i];

    if (l.startsWith("```")) {                       // fenced code
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(`<pre style="font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;color:#e8e4dc;background:#16181c;border-radius:4px;padding:18px 20px;overflow-x:auto;margin:20px 0"><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^\|/.test(l) && /^\|[\s:|-]+\|$/.test(lines[i + 1] || "")) {   // table
      const head = l.split("|").slice(1, -1).map((c) => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i].split("|").slice(1, -1).map((c) => c.trim()));
        i++;
      }
      out.push(
        `<div style="overflow-x:auto;margin:22px 0"><table style="border-collapse:collapse;width:100%;font-size:14.5px;min-width:420px">` +
        `<thead><tr>${head.map((h) => `<th style="text-align:left;font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:#8d8880;font-weight:400;padding:10px 14px;border-bottom:1px solid #ddd9d0">${inline(h)}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="padding:11px 14px;border-bottom:1px solid #f0ece4;color:#4a4741;vertical-align:top">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      );
      continue;
    }
    if (/^>\s?/.test(l)) {                            // blockquote
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<div style="border-left:2px solid #cf8c2e;padding:2px 0 2px 18px;margin:22px 0;color:#4a4741;font-size:15.5px;line-height:1.6">${inline(buf.join(" "))}</div>`);
      continue;
    }
    if (/^[-*] /.test(l)) {                           // list
      const buf = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) buf.push(lines[i++].replace(/^[-*] /, ""));
      out.push(`<ul style="margin:16px 0;padding-left:20px;color:#4a4741;font-size:15.5px;line-height:1.7">${buf.map((b) => `<li style="margin:5px 0">${inline(b)}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const buf = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) buf.push(lines[i++].replace(/^\d+\. /, ""));
      out.push(`<ol style="margin:16px 0;padding-left:22px;color:#4a4741;font-size:15.5px;line-height:1.7">${buf.map((b) => `<li style="margin:5px 0">${inline(b)}</li>`).join("")}</ol>`);
      continue;
    }
    const h = /^(#{1,4}) (.+)$/.exec(l);
    if (h) {
      const lvl = h[1].length, txt = h[2], id = slug(txt);
      if (lvl === 2) toc.push({ id, txt });
      const size = [0, 34, 26, 19, 16][lvl];
      const mt = lvl <= 2 ? 52 : 32;
      out.push(`<h${lvl} id="${id}" style="font-size:${size}px;letter-spacing:-0.02em;font-weight:500;margin:${mt}px 0 12px;scroll-margin-top:84px">${inline(txt)}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^---+$/.test(l)) { out.push('<hr style="border:0;border-top:1px solid #e6e2da;margin:44px 0">'); i++; continue; }
    if (!l.trim()) { i++; continue; }

    const buf = [];                                   // paragraph
    while (i < lines.length && lines[i].trim() && !/^(#{1,4} |[-*] |\d+\. |```|\||>|---+$)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p style="font-size:16px;line-height:1.68;color:#4a4741;margin:14px 0;max-width:74ch">${inline(buf.join(" "))}</p>`);
  }
  return { html: out.join("\n"), toc };
}

export function docsPage(guide, reference) {
  const g = mdToHtml(guide), r = mdToHtml(reference);
  const nav = [...g.toc.map((t) => ({ ...t, s: "Guide" })), ...r.toc.map((t) => ({ ...t, s: "Reference" }))];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Documentation — Statusline</title>
<meta name="description" content="Install, concepts, recipes and the full reference for Statusline — the visual builder for Claude Code and tmux status lines.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;background:#faf9f7;-webkit-font-smoothing:antialiased;font-family:'IBM Plex Sans',Helvetica,sans-serif;color:#16181c}
  a{color:#16181c;text-decoration:none} a:hover{color:#a86a12}
  ::selection{background:#f2e3c6}
  .toc a{display:block;padding:5px 0;font-size:14px;color:#56534d}
  .toc a:hover{color:#a86a12}
  @media (max-width:900px){ .shell{grid-template-columns:1fr !important} .toc{position:static !important;border-right:0 !important;border-bottom:1px solid #e6e2da;padding-bottom:20px} }
</style>
</head>
<body>
<header style="position:sticky;top:0;z-index:20;background:rgba(250,249,247,.88);backdrop-filter:blur(10px);border-bottom:1px solid #e6e2da">
  <div style="max-width:1180px;margin:0 auto;padding:0 32px;min-height:64px;display:flex;align-items:center;gap:24px;flex-wrap:wrap">
    <a href="/" style="display:flex;align-items:baseline;gap:10px">
      <span style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:700;letter-spacing:.14em">STATUSLINE</span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:#8d8880">DOCS</span>
    </a>
    <div style="margin-left:auto;display:flex;gap:22px;font-size:14px;color:#56534d">
      <a href="/" style="color:#56534d">Home</a>
      <a href="/app" style="color:#56534d">Builder</a>
      <a href="https://github.com/Bravim-Ketan-Purohit/statusline" style="color:#56534d">GitHub</a>
    </div>
  </div>
</header>
<div class="shell" style="max-width:1180px;margin:0 auto;padding:0 32px;display:grid;grid-template-columns:220px 1fr;gap:56px;align-items:start">
  <nav class="toc" style="position:sticky;top:96px;padding:40px 24px 40px 0;border-right:1px solid #e6e2da;max-height:calc(100vh - 120px);overflow-y:auto">
    ${nav.map((t, i) => {
      const head = i === 0 || nav[i - 1].s !== t.s
        ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:#8d8880;margin:${i ? 22 : 0}px 0 8px">${t.s.toUpperCase()}</div>` : "";
      return head + `<a href="#${t.id}">${t.txt}</a>`;
    }).join("\n    ")}
  </nav>
  <main style="padding:40px 0 96px;min-width:0">
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;color:#8d8880;margin-bottom:10px">DOCUMENTATION</div>
    ${g.html}
    <hr style="border:0;border-top:1px solid #e6e2da;margin:64px 0">
    ${r.html}
  </main>
</div>
<footer style="border-top:1px solid #e6e2da;background:#f5f2ec">
  <div style="max-width:1180px;margin:0 auto;padding:40px 32px;display:flex;gap:32px;flex-wrap:wrap;font-size:14px;color:#8d8880">
    <span style="font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:.14em;color:#16181c">STATUSLINE</span>
    <span>MIT licensed.</span>
    <span style="margin-left:auto"><a href="#" style="color:#56534d">Back to top</a></span>
  </div>
</footer>
</body>
</html>`;
}
