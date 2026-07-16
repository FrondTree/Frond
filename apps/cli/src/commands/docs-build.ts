import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { compileProject } from "@frond/compiler";
import { loadProjectConfig } from "@frond/config";
import { findFrondRoot } from "../find-root.js";

export async function docsBuildCommand(opts: { out: string }) {
  const root = await findFrondRoot();
  if (!root) throw new Error("No frond/ directory found. Run `frond init` first.");

  const { docs } = await loadProjectConfig(root);
  const { manifest, openapiHash, bundleFiles } = await compileProject(root, docs);
  const outDir = path.resolve(root, opts.out);
  await mkdir(outDir, { recursive: true });

  await writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  for (const [rel, content] of bundleFiles) {
    const dest = path.join(outDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, content);
  }

  // Minimal static index that loads the built manifest
  await writeFile(
    path.join(outDir, "index.html"),
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${manifest.title}</title></head>
<body><h1>${manifest.title}</h1>
<p>Static build — ${manifest.pages.length} pages, ${manifest.endpoints.length} endpoints.</p>
<p>Open <code>manifest.json</code> or point the docs app at this folder.</p>
<script>fetch('./manifest.json').then(r=>r.json()).then(m=>console.log('Frond build', m))</script>
</body></html>`,
  );

  console.log(chalk.green("✓"), `Built docs to ${outDir}`);
  console.log(chalk.dim(`  openapi hash: ${openapiHash}`));
  console.log(chalk.dim(`  pages: ${manifest.pages.length} · endpoints: ${manifest.endpoints.length}`));
}
