import path from "node:path";
import chalk from "chalk";
import { loadProjectConfig } from "@frond/config";
import { extractEndpoints, parseOpenAPIFile } from "@frond/compiler";
import { findFrondRoot } from "../find-root.js";

export async function diffCommand(opts: { from?: string; to?: string }) {
  const root = await findFrondRoot();
  if (!root) throw new Error("No frond/ directory found.");

  const { docs } = await loadProjectConfig(root);
  const fromId = opts.from ?? docs.versions[0]?.id;
  const toId = opts.to ?? docs.versions[1]?.id;

  if (!fromId || !toId) {
    throw new Error("Need two versions. Use --from and --to or configure multiple versions.");
  }

  const fromVersion = docs.versions.find((v) => v.id === fromId);
  const toVersion = docs.versions.find((v) => v.id === toId);
  if (!fromVersion || !toVersion) throw new Error("Version not found");

  const fromSpec = await parseOpenAPIFile(path.resolve(root, "docs", fromVersion.path));
  const toSpec = await parseOpenAPIFile(path.resolve(root, "docs", toVersion.path));

  const fromEndpoints = extractEndpoints(fromSpec, fromId);
  const toEndpoints = extractEndpoints(toSpec, toId);

  const fromKeys = new Set(fromEndpoints.map((e) => `${e.method} ${e.path}`));
  const toKeys = new Set(toEndpoints.map((e) => `${e.method} ${e.path}`));

  const added = [...toKeys].filter((k) => !fromKeys.has(k));
  const removed = [...fromKeys].filter((k) => !toKeys.has(k));

  console.log(chalk.bold(`\nAPI Diff: ${fromId} → ${toId}`));
  console.log(chalk.dim("────────────────────────────"));

  if (added.length) {
    console.log(chalk.green("\nAdded:"));
    for (const a of added) console.log(chalk.green("+"), a);
  }
  if (removed.length) {
    console.log(chalk.red("\nRemoved:"));
    for (const r of removed) console.log(chalk.red("-"), r);
  }
  if (!added.length && !removed.length) {
    console.log(chalk.green("\nNo endpoint additions or removals."));
  }
  console.log();
}
