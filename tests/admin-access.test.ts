import { afterEach, describe, expect, it } from "vitest";
import { getAdminEmailAllowlist, isAdminEmail } from "@/lib/runtime-config";

const originalAllowlist = process.env.MERIT_ADMIN_EMAIL_ALLOWLIST;

afterEach(() => {
  if (originalAllowlist === undefined) {
    delete process.env.MERIT_ADMIN_EMAIL_ALLOWLIST;
    return;
  }
  process.env.MERIT_ADMIN_EMAIL_ALLOWLIST = originalAllowlist;
});

describe("admin email allowlist", () => {
  it("includes the default Merit dev account without env setup", () => {
    delete process.env.MERIT_ADMIN_EMAIL_ALLOWLIST;
    expect(isAdminEmail("turtlesrqul@gmail.com")).toBe(true);
    expect(isAdminEmail("TURTLESRQUL@GMAIL.COM")).toBe(true);
  });

  it("merges configured admin emails with the default dev account", () => {
    process.env.MERIT_ADMIN_EMAIL_ALLOWLIST = "admin@example.com";
    expect(getAdminEmailAllowlist()).toEqual(["turtlesrqul@gmail.com", "admin@example.com"]);
  });
});
