import { describe, expect, it } from "vitest";
import {
  buildClaimPassportPath,
  buildClaimPassportUrl,
  resolveClaimLinkBaseUrl
} from "@/lib/auth/claim-links";

describe("claim passport links", () => {
  it("uses the exact claim passport route", () => {
    expect(buildClaimPassportPath("abc123")).toBe("/claim/passport/abc123");
  });

  it("encodes tokens in generated claim URLs", () => {
    expect(buildClaimPassportUrl("token with space", "http://localhost:3004")).toBe(
      "http://localhost:3004/claim/passport/token%20with%20space"
    );
  });

  it("prefers the current local request origin over configured production URLs", () => {
    expect(
      resolveClaimLinkBaseUrl({
        fallbackSiteUrl: "https://meritsg.com",
        origin: "http://localhost:3004"
      })
    ).toBe("http://localhost:3004");
  });

  it("uses deployed host headers when request origin is unavailable", () => {
    expect(
      resolveClaimLinkBaseUrl({
        forwardedHost: "preview.meritsg.com",
        forwardedProto: "https",
        fallbackSiteUrl: "https://meritsg.com"
      })
    ).toBe("https://preview.meritsg.com");
  });
});
