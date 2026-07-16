import { readFile, rm } from "node:fs/promises";
import chalk from "chalk";
import ora from "ora";
import { compileProject } from "@frond/compiler";
import { loadProjectConfig } from "@frond/config";
import { createTarGzBundle } from "../bundle.js";
import { findFrondRoot } from "../find-root.js";
import { authHeader, loadCredentials } from "../utils.js";

export async function docsPublishCommand(opts: { projectId?: string }) {
  const root = await findFrondRoot();
  if (!root) throw new Error("No frond/ directory found. Run `frond init` first.");

  const creds = await loadCredentials();
  if (!creds.token && !creds.apiKey) {
    throw new Error(
      "Not authenticated. Create an API key in Dashboard → API keys, then run:\n" +
        "  frond login --api-key frond_...\n" +
        "Or set FROND_API_KEY in the environment.",
    );
  }

  const { docs, frond } = await loadProjectConfig(root);
  const projectId = opts.projectId || (frond as { projectId?: string }).projectId;
  if (!projectId) {
    throw new Error(
      "Project ID required. Pass --project-id <uuid> or set projectId in frond/frond.config.json\n" +
        "Copy the ID from Dashboard → Overview.",
    );
  }

  const spinner = ora("Compiling documentation").start();
  const { manifest, openapiHash, bundleFiles } = await compileProject(root, docs);

  const bundlePath = await createTarGzBundle(bundleFiles);
  const bundle = await readFile(bundlePath);

  spinner.text = "Publishing to Frond";

  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));
  form.append("version_label", manifest.versions[0]?.id ?? "latest");
  form.append("openapi_hash", openapiHash);
  form.append("bundle", new Blob([bundle]), "bundle.tar.gz");

  const res = await fetch(`${creds.apiUrl}/v1/projects/${projectId}/publish`, {
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
