import { access } from "node:fs/promises";
import path from "node:path";

export async function findFrondRoot(startDir = process.cwd()): Promise<string | null> {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, "frond");
    try {
      await access(path.join(candidate, "frond.config.json"));
      return candidate;
    } catch {
      /* continue */
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
