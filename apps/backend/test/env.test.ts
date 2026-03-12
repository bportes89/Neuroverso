import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("env", () => {
  it("applies defaults in development", () => {
    const env = loadEnv({} as any);
    expect(env.PORT).toBe(4000);
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(16);
    expect(env.DATABASE_URL.length).toBeGreaterThan(0);
    expect(env.REDIS_URL.length).toBeGreaterThan(0);
  });
});

