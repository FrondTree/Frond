import http from "node:http";
import { watch } from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { compileProject, type CompiledManifest } from "@frond/compiler";
import { loadProjectConfig } from "@frond/config";
import { findFrondRoot } from "../find-root.js";

function previewHTML(port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Frond Docs Dev</title>
  <style>
    :root {
      --bg:#f4f6fa; --fg:#141a24; --muted:#5b6578; --border:#d8dee9; --card:#ffffff;
      --sidebar:#eef1f7; --primary:#2563eb; --accent:#e8effc; --code:#eef2f8;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg:#0d1118; --fg:#eef2f8; --muted:#93a0b5; --border:#243044; --card:#141a24;
        --sidebar:#111722; --primary:#60a5fa; --accent:#1a2740; --code:#161d2a;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin:0; font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
      background:var(--bg); color:var(--fg);
      background-image: radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,.12), transparent 55%);
    }
    .layout { display:grid; grid-template-columns:260px 1fr; min-height:100vh; }
    aside { border-right:1px solid var(--border); background:var(--sidebar); padding:1.1rem; overflow:auto; }
    main { padding:2.25rem; max-width:820px; animation: fade .35s ease-out; }
    @keyframes fade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
    a { color:inherit; text-decoration:none; }
    .brand { font-weight:600; margin-bottom:1rem; letter-spacing:-.02em; }
    .brand span.frond { color:var(--primary); }
    .nav a { display:block; padding:.45rem .65rem; border-radius:8px; color:var(--muted); font-size:.875rem; }
    .nav a:hover, .nav a.active { background:var(--accent); color:var(--primary); font-weight:500; }
    .section { margin-top:1.1rem; font-size:.7rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted); font-weight:500; }
    h1 { font-size:1.85rem; margin:0 0 .75rem; letter-spacing:-.02em; }
    .muted { color:var(--muted); }
    pre, code { font-family: "IBM Plex Mono", ui-monospace, monospace; }
    pre { background:var(--code); border:1px solid var(--border); border-radius:10px; padding:1rem; overflow:auto; }
    .method { font-size:.7rem; font-weight:700; padding:.15rem .45rem; border-radius:5px; background:var(--accent); color:var(--primary); }
    #search { width:100%; margin-bottom:1rem; padding:.55rem .75rem; border:1px solid var(--border); border-radius:8px; background:var(--card); color:var(--fg); box-shadow:0 1px 2px rgba(0,0,0,.03); }
    .bar { display:flex; gap:.5rem; align-items:center; margin-bottom:1rem; }
    .badge { font-size:.7rem; color:var(--muted); border:1px solid var(--border); border-radius:6px; padding:.15rem .5rem; background:var(--card); }
    @media (max-width:800px) { .layout { grid-template-columns:1fr; } aside { border-right:0; border-bottom:1px solid var(--border); } }
  </style>
</head>
<body>
  <div class="layout">
    <aside>
      <div class="brand"><span class="frond">Frond</span> Docs <span class="badge">dev :${port}</span></div>
      <input id="search" placeholder="Search docs… (⌘K)" />
      <nav class="nav" id="nav"></nav>
    </aside>
    <main id="content"><p class="muted">Loading manifest…</p></main>
  </div>
  <script>
    let manifest = null;
    const content = document.getElementById('content');
    const nav = document.getElementById('nav');
    const search = document.getElementById('search');

    async function load() {
      const res = await fetch('/manifest');
      manifest = await res.json();
      renderNav();
      route();
    }

    function renderNav(filter='') {
      const q = filter.toLowerCase();
      const pages = (manifest.pages||[]).filter(p => !q || p.title.toLowerCase().includes(q) || (p.content||'').toLowerCase().includes(q));
      const endpoints = (manifest.endpoints||[]).filter(e => !q || e.path.toLowerCase().includes(q) || e.summary?.toLowerCase().includes(q));
      let html = '<div class="section">Guides</div>';
      for (const p of pages) html += \`<a href="#\${p.slug}" data-type="page" data-id="\${p.id}">\${p.title}</a>\`;
      html += '<div class="section">API</div>';
      for (const e of endpoints) html += \`<a href="#api/\${e.versionId}/\${e.method}\${e.path}" data-type="endpoint" data-id="\${e.id}"><span class="method">\${e.method}</span> \${e.path}</a>\`;
      nav.innerHTML = html;
    }

    function route() {
      const hash = location.hash.slice(1) || '/';
      if (hash.startsWith('api/')) {
        const parts = hash.split('/');
        const versionId = parts[1];
        const rest = '/' + parts.slice(2).join('/');
        const methodPath = rest.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)(\\/.*)$/i);
        let ep;
        if (methodPath) {
          ep = (manifest.endpoints||[]).find(e => e.versionId===versionId && e.method===methodPath[1].toUpperCase() && e.path===methodPath[2]);
        }
        if (!ep) { content.innerHTML = '<p class="muted">Endpoint not found</p>'; return; }
        content.innerHTML = \`
          <div class="bar"><span class="method">\${ep.method}</span><code>\${ep.path}</code><span class="badge">\${ep.versionId}</span></div>
          <h1>\${ep.summary || ep.operationId || ep.path}</h1>
          <p class="muted">\${ep.description || ''}</p>
          <h3>Responses</h3>
          <pre>\${JSON.stringify(ep.responses || {}, null, 2)}</pre>
          <h3>Try it</h3>
          <p class="muted">Use the published docs playground for full auth presets. Local preview shows contract only.</p>
        \`;
        return;
      }
      const page = (manifest.pages||[]).find(p => p.slug === hash || p.slug === '/' + hash.replace(/^\\//,''));
      const landing = (manifest.pages||[]).find(p => p.type==='landing') || (manifest.pages||[])[0];
      const target = page || (hash==='/' || hash==='' ? landing : null);
      if (!target) { content.innerHTML = '<p class="muted">Page not found</p>'; return; }
      content.innerHTML = \`<h1>\${target.title}</h1><div class="prose">\${markdown(target.content||'')}</div>\`;
    }

    function markdown(md) {
      return md
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
        .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\\n\\n/g, '</p><p>')
        .replace(/^/, '<p>').replace(/$/, '</p>');
    }

    search.addEventListener('input', () => renderNav(search.value));
    window.addEventListener('hashchange', route);
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); search.focus(); }
    });
    load();
    setInterval(async () => {
      try {
        const res = await fetch('/manifest');
        const next = await res.json();
        if (JSON.stringify(next) !== JSON.stringify(manifest)) {
          manifest = next; renderNav(search.value); route();
        }
      } catch {}
    }, 1500);
  </script>
</body>
</html>`;
}

export async function docsDevCommand(opts: { port: string }) {
  const found = await findFrondRoot();
  if (!found) throw new Error("No frond/ directory found. Run `frond init` first.");
  const root = found;

  let { docs } = await loadProjectConfig(root);
  let compiled = await compileProject(root, docs);
  let manifest: CompiledManifest = compiled.manifest;
  const port = parseInt(opts.port, 10);
  let compiling = false;

  async function recompile(reason: string) {
    if (compiling) return;
    compiling = true;
    try {
      ({ docs } = await loadProjectConfig(root));
      compiled = await compileProject(root, docs);
      manifest = compiled.manifest;
      console.log(chalk.green("✓"), chalk.dim(`Recompiled (${reason}) — ${manifest.endpoints.length} endpoints, ${manifest.pages.length} pages`));
    } catch (err) {
      console.error(chalk.red("Compile error:"), err instanceof Error ? err.message : err);
    } finally {
      compiling = false;
    }
  }

  const watchDir = path.join(root, "frond");
  try {
    watch(watchDir, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (filename.includes("node_modules") || filename.endsWith("~")) return;
      void recompile(filename);
    });
  } catch {
    console.log(chalk.yellow("!"), "fs.watch unavailable — polling /manifest clients every 1.5s after manual recompile only");
  }

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const url = req.url?.split("?")[0] ?? "/";

    if (url === "/manifest") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(manifest));
      return;
    }

    if (url === "/health") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "ok", endpoints: manifest.endpoints.length, pages: manifest.pages.length }));
      return;
    }

    if (url === "/" || url === "/index.html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(previewHTML(port));
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(port, () => {
    console.log(chalk.bold("\nFrond Docs Dev Server"));
    console.log(chalk.dim("─────────────────────"));
    console.log(chalk.green("✓"), `Parsed ${manifest.endpoints.length} endpoint(s)`);
    console.log(chalk.green("✓"), `Loaded ${manifest.pages.length} guide page(s)`);
    console.log(chalk.cyan(`\n→ Preview:  http://localhost:${port}/`));
    console.log(chalk.cyan(`→ Manifest: http://localhost:${port}/manifest`));
    console.log(chalk.dim("\nWatching frond/ for changes (hot reload).\n"));
  });
}
