import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { loadProjectConfig } from "@frond/config";
import { generateSDKs } from "@frond/sdk-generator";
import { findFrondRoot } from "../find-root.js";

export async function generateCommand(opts: { group: string }) {
  const root = await findFrondRoot();
  if (!root) throw new Error("No frond/ directory found.");

  const spinner = ora("Generating SDKs").start();
  const { docs, generators } = await loadProjectConfig(root);
  const version = docs.versions[0];
  if (!version) throw new Error("No API versions configured");

  const openApiPath = path.resolve(root, "docs", version.path);
  const outputs = await generateSDKs({
    rootDir: root,
    openApiPath,
    generators,
    group: opts.group,
  });

  spinner.succeed(`Generated ${outputs.length} SDK(s)`);
  for (const out of outputs) {
    console.log(chalk.green("✓"), out);
  }
}
