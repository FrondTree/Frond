import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import * as tar from "tar";

export async function createTarGzBundle(
  files: Map<string, string>,
): Promise<string> {
  const dir = path.join(tmpdir(), `frond-bundle-${randomUUID()}`);
  const { mkdir, writeFile, rm } = await import("node:fs/promises");
  await mkdir(dir, { recursive: true });

  for (const [name, content] of files) {
    const filePath = path.join(dir, name);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content);
  }

  const outPath = path.join(tmpdir(), `frond-bundle-${randomUUID()}.tar.gz`);
  await tar.c({ gzip: true, file: outPath, cwd: dir }, Array.from(files.keys()));

  await rm(dir, { recursive: true, force: true });
  return outPath;
}

export async function readBundleFile(bundlePath: string): Promise<Buffer> {
  return readFile(bundlePath);
}
