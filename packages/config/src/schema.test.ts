import { describe, expect, it } from "vitest";
import { FrondConfigSchema } from "./schema.js";

describe("FrondConfigSchema", () => {
  it("validates minimal config", () => {
    const result = FrondConfigSchema.safeParse({
      organization: "acme",
      project: "payments",
      docs: { title: "Payments API" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty organization", () => {
    const result = FrondConfigSchema.safeParse({
      organization: "",
      project: "payments",
      docs: { title: "Payments API" },
    });
    expect(result.success).toBe(false);
  });
});
