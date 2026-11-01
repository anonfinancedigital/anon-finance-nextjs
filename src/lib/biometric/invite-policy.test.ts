import { describe, expect, it } from "vitest";
import { shouldShowInvite } from "./invite-policy";

const eligible = { supported: true, hasLock: false, dismissed: false, pathname: "/" };

describe("shouldShowInvite", () => {
  it("is true with support, no lock, no dismissal and a page other than /conta (INVITE-01)", () => {
    expect(shouldShowInvite(eligible)).toBe(true);
    expect(shouldShowInvite({ ...eligible, pathname: "/transacoes" })).toBe(true);
  });

  it("is false when the device has no biometric support (INVITE-02)", () => {
    expect(shouldShowInvite({ ...eligible, supported: false })).toBe(false);
  });

  it("is false when the user has a lock record (INVITE-03)", () => {
    expect(shouldShowInvite({ ...eligible, hasLock: true })).toBe(false);
  });

  it("is false when the user dismissed the invite (INVITE-04)", () => {
    expect(shouldShowInvite({ ...eligible, dismissed: true })).toBe(false);
  });

  it("is false on /conta, with a trailing slash and on a subpath (INVITE-05)", () => {
    expect(shouldShowInvite({ ...eligible, pathname: "/conta" })).toBe(false);
    expect(shouldShowInvite({ ...eligible, pathname: "/conta/" })).toBe(false);
    expect(shouldShowInvite({ ...eligible, pathname: "/conta/privacidade" })).toBe(false);
  });
});
