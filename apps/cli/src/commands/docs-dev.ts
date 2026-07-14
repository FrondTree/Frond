import http from "node:http";
import chalk from "chalk";
import { compileProject } from "@frond/compiler";
import { loadProjectConfig } from "@frond/config";
import { findFrondRoot } from "../find-root.js";

export async function docsDevCommand(opts: { port: string }) {
  const root = await findFrondRoot();
  if (!root) throw new Error("No frond/ directory found. Run `frond init` first.");

  const { docs } = await loadProjectConfig(root);
  const { manifest } = await compileProject(root, docs);
  const port = parseInt(opts.port, 10);

  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/manifest") {
      res.end(JSON.stringify(manifest));
      return;
    }

    if (req.url?.startsWith("/health")) {
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not_found" }));
  });

  server.listen(port, () => {
    console.log(chalk.bold("\nFrond Docs Dev Server"));
    console.log(chalk.dim("─────────────────────"));
    console.log(chalk.green("✓"), `Parsed ${manifest.endpoints.length} endpoint(s)`);
    console.log(chalk.green("✓"), `Loaded ${manifest.pages.length} guide page(s)`);
    console.log(chalk.cyan(`\n→ Local: http://localhost:${port}/manifest`));
    console.log(chalk.dim("\nOpen the docs web app pointed at this manifest for full preview."));
    console.log(chalk.dim("Watching — re-run frond docs dev after changes.\n"));
  });
}
