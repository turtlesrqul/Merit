import { describe, expect, it } from "vitest";
import { buildAuthPath, resolveSafeAuthNext } from "@/lib/auth/auth-urls";

describe("auth next URL helpers", () => {
  it("preserves safe claim passport next paths on sign in and sign up", () => {
    const nextPath = "/claim/passport/abc123";

    expect(buildAuthPath("/sign-in", nextPath)).toBe(
      "/sign-in?next=%2Fclaim%2Fpassport%2Fabc123"
    );
    expect(buildAuthPath("/sign-up", nextPath)).toBe(
      "/sign-up?next=%2Fclaim%2Fpassport%2Fabc123"
    );
  });

  it("falls back to home for unsafe next paths", () => {
    expect(resolveSafeAuthNext("https://evil.example/claim")).toBe("/home");
    expect(resolveSafeAuthNext("//evil.example/claim")).toBe("/home");
    expect(buildAuthPath("/sign-in", "https://evil.example/claim")).toBe("/sign-in");
  });
});
