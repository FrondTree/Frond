import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import ora from "ora";
import { compileProject } from "@frond/compiler";
import { loadProjectConfig } from "@frond/config";
import { createTarGzBundle } from "../bundle.js";
import { findFrondRoot } from "../find-root.js";
import { authHeader, loadCredentials } from "../utils.js";

export async function docsPublishCommand(opts: { projectId?: string }) {
  if (!opts.projectId) {
    throw new Error("--project-id is required. Create a project in the Frond dashboard first.");
  }

  const root = await findFrondRoot();
  if (!root) throw new Error("No frond/ directory found.");

  const creds = await loadCredentials();
  if (!creds.token && !creds.apiKey) {
    throw new Error("Not authenticated. Run `frond login` first.");
  }

  const spinner = ora("Compiling documentation").start();
  const { docs, frond } = await loadProjectConfig(root);
  const { manifest, openapiHash, bundleFiles } = await compileProject(root, docs);

  const bundlePath = await createTarGzBundle(bundleFiles);
  const bundle = await readFile(bundlePath);

  spinner.text = "Publishing to Frond cloud";

  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));
  form.append("version_label", manifest.versions[0]?.id ?? "latest");
  form.append("openapi_hash", openapiHash);
  form.append("bundle", new Blob([bundle]), "bundle.tar.gz");

  const res = await fetch(`${creds.apiUrl}/v1/projects/${opts.projectId}/publish`, {
    method: "POST",
    headers: authHeader(creds),
    body: form,
  });

  await rm(bundlePath, { force: true });

  if (!res.ok) {
    const err = await res.text();
    spinner.fail("Publish failed");
    throw new Error(err);
  }

  const data = (await res.json()) as { url: string };
  spinner.succeed("Published successfully");
  console.log(chalk.cyan("\n→"), data.url);
  console.log(chalk.dim(`  ${frond.organization}/${frond.project}\n`));
}
