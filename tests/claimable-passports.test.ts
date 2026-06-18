import { describe, expect, it } from "vitest";
import {
  generatePassportSlugFromName,
  normalizePassportSlugValue,
  validatePassportSlug
} from "@/lib/passports/slug";

describe("claimable Passport public paths", () => {
  it("normalizes names into URL-safe public paths", () => {
    expect(normalizePassportSlugValue(" Jane   Tan! Design ")).toBe("jane-tan-design");
    expect(generatePassportSlugFromName("Jane Tan")).toBe("jane-tan");
  });

  it("avoids reserved route words when auto-generating from names", () => {
    expect(generatePassportSlugFromName("Admin")).toBe("admin-passport");
    expect(generatePassportSlugFromName("Al")).toBe("al-passport");
    expect(() => validatePassportSlug("admin")).toThrow(/reserved/);
  });

  it("rejects unsafe public paths", () => {
    expect(() => validatePassportSlug("ab")).toThrow(/3-80/);
    expect(() => validatePassportSlug("jane--tan")).toThrow(/3-80/);
    expect(() => validatePassportSlug("jane-tan")).not.toThrow();
  });
});
