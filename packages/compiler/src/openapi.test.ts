import { describe, expect, it } from "vitest";
import { extractEndpoints } from "./openapi.js";
import type { OpenAPISpec } from "./types.js";

describe("extractEndpoints", () => {
  it("extracts GET and POST endpoints", () => {
    const spec: OpenAPISpec = {
      paths: {
        "/users": {
          get: { summary: "List users", operationId: "listUsers" },
          post: { summary: "Create user", operationId: "createUser" },
        },
      },
    };

    const endpoints = extractEndpoints(spec, "v1");
    expect(endpoints).toHaveLength(2);
    expect(endpoints[0]?.method).toBe("GET");
    expect(endpoints[1]?.method).toBe("POST");
  });
});
