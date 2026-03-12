import { describe, expect, it } from "vitest";
import { getApiBaseUrl } from "../src/lib/api";

describe("frontend smoke", () => {
  it("has an API base URL", () => {
    expect(typeof getApiBaseUrl()).toBe("string");
    expect(getApiBaseUrl().length).toBeGreaterThan(0);
  });
});

