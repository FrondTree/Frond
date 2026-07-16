import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import {
  DEFAULT_DOCS_YML,
  DEFAULT_FROND_CONFIG,
  DEFAULT_GENERATORS_YML,
  DEFAULT_INDEX_MDX,
  DEFAULT_OPENAPI,
  DEFAULT_QUICKSTART_MDX,
} from "@frond/config";

export async function initCommand() {
  const spinner = ora("Initializing Frond project").start();
  const root = path.join(process.cwd(), "frond");

  try {
    await mkdir(path.join(root, "openapi", "v1"), { recursive: true });
    await mkdir(path.join(root, "docs", "pages"), { recursive: true });

    await writeFile(
      path.join(root, "frond.config.json"),
      JSON.stringify(DEFAULT_FROND_CONFIG, null, 2) + "\n",
    );
    await writeFile(path.join(root, "docs", "docs.yml"), DEFAULT_DOCS_YML);
    await writeFile(path.join(root, "generators.yml"), DEFAULT_GENERATORS_YML);
    await writeFile(path.join(root, "openapi", "v1", "openapi.yaml"), DEFAULT_OPENAPI);
    await writeFile(path.join(root, "docs", "pages", "index.mdx"), DEFAULT_INDEX_MDX);
    await writeFile(path.join(root, "docs", "pages", "quickstart.mdx"), DEFAULT_QUICKSTART_MDX);

    spinner.succeed("Frond project initialized");
    console.log(chalk.dim("\nNext steps:"));
    console.log(`  1. Create a project in the Frond dashboard (Overview)`);
    console.log(`  2. Create an API key (Dashboard → API keys)`);
    console.log(`  3. ${chalk.cyan("frond login --api-key frond_...")}`);
    console.log(`  4. Add projectId to frond/frond.config.json`);
    console.log(`  5. ${chalk.cyan("frond docs publish")}`);
    console.log(`     or ${chalk.cyan("frond docs publish --project-id <uuid>")}\n`);
    console.log(`  Preview: ${chalk.cyan("frond docs dev")}  ·  Check: ${chalk.cyan("frond validate")}\n`);
  } catch (err) {
    spinner.fail("Failed to initialize");
    throw err;
  }
}
