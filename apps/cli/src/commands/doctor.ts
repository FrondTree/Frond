import { readFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { loadProjectConfig, ConfigError } from "@frond/config";
import { parseOpenAPIFile } from "@frond/compiler";
import { findFrondRoot } from "../find-root.js";

export async function doctorCommand() {
  const root = await findFrondRoot();
  if (!root) {
    throw new Error("No frond/ directory found. Run `frond init` first.");
  }

  console.log(chalk.bold("\nFrond Health Check"));
  console.log(chalk.dim("──────────────────"));

  let errors = 0;
  let warnings = 0;

  try {
    const config = await loadProjectConfig(root);
    console.log(chalk.green("✓"), "frond.config.json valid");
    console.log(chalk.green("✓"), "docs/docs.yml valid");
    console.log(chalk.green("✓"), "generators.yml valid");

    for (const version of config.docs.versions) {
      const specPath = path.resolve(root, "docs", version.path);
      try {
        const spec = await parseOpenAPIFile(specPath);
        const count = Object.keys(spec.paths ?? {}).length;
        console.log(chalk.green("✓"), `openapi ${version.id}: ${count} path(s)`);
      } catch (err) {
        console.log(chalk.red("✗"), `openapi ${version.id}:`, (err as Error).message);
        errors++;
      }
    }

    for (const item of config.docs.navigation) {
      if ("section" in item) {
        for (const page of item.contents) {
          const pagePath = path.resolve(root, "docs", page.path);
          try {
            await readFile(pagePath, "utf-8");
            console.log(chalk.green("✓"), `page: ${page.page}`);
          } catch {
            console.log(chalk.red("✗"), `page missing: ${page.path}`);
            errors++;
          }
        }
      }
    }

    if (!config.docs.playground) {
      console.log(chalk.yellow("⚠"), "No playground config — Try API will use defaults");
      warnings++;
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      console.log(chalk.red("✗"), err.message);
      errors++;
    } else {
      throw err;
    }
  }

  console.log();
  if (errors > 0) {
    console.log(chalk.red(`${errors} error(s), ${warnings} warning(s) — fix before publishing`));
    process.exit(1);
  }
  console.log(chalk.green(`All checks passed (${warnings} warning(s))`));
}
