import chalk from "chalk";
import { loadProjectConfig, ConfigError } from "@frond/config";
import { findFrondRoot } from "../find-root.js";

export async function validateCommand() {
  const root = await findFrondRoot();
  if (!root) {
    throw new Error("No frond/ directory found. Run `frond init` first.");
  }

  try {
    const config = await loadProjectConfig(root);
    console.log(chalk.green("✓"), "frond.config.json");
    console.log(chalk.green("✓"), "docs/docs.yml");
    console.log(chalk.green("✓"), "generators.yml");
    console.log(chalk.green("✓"), `${config.docs.versions.length} API version(s)`);
    console.log(chalk.green("\nConfiguration is valid."));
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(chalk.red("✗"), err.file ?? "", err.message);
      process.exit(1);
    }
    throw err;
  }
}
