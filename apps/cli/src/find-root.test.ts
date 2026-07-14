import { describe, expect, it } from "vitest";
import { findFrondRoot } from "./find-root.js";

describe("findFrondRoot", () => {
  it("returns null when no frond config exists in cwd", async () => {
    const result = await findFrondRoot("/nonexistent-path-frond-test");
    expect(result).toBeNull();
  });
});
