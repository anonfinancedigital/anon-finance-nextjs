import { describe, expect, it } from "vitest";
import { broadcastSchema, isAllowedPushEndpoint, preferencesSchema, subscriptionSchema } from "./push";

const ENDPOINT_ERROR = "Este navegador não é compatível com notificações";
const KEY_ERROR = "Inscrição inválida";
const PREFS_ERROR = "Preferências inválidas";
const BROADCAST_ERROR = "A mensagem deve ter de 1 a 140 caracteres";

const b64url = (bytes: number[]) => Buffer.from(bytes).toString("base64url");
const P256DH = b64url([0x04, ...Array.from({ length: 64 }, (_, i) => i)]);
const AUTH = b64url(Array.from({ length: 16 }, (_, i) => i));

describe("isAllowedPushEndpoint (PUSH-05)", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://wns2-par02p.notify.windows.com/?token=abc",
    "https://wns2.notify.windows.com/w/?token=abc",
  ])("accepts %s", (endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(true);
  });

  it.each([
    ["http scheme", "http://fcm.googleapis.com/fcm/send/abc"],
    ["localhost", "https://localhost/push"],
    ["IPv4", "https://127.0.0.1/push"],
    ["private IPv4", "https://10.0.0.5/push"],
    ["IPv6", "https://[::1]/push"],
    ["explicit port", "https://fcm.googleapis.com:8443/fcm/send/abc"],
    ["user and password", "https://user:pass@fcm.googleapis.com/fcm/send/abc"],
    ["user only", "https://user@fcm.googleapis.com/fcm/send/abc"],
    ["lookalike suffix host", "https://x.push.apple.com.evil.net/abc"],
    ["lookalike prefix", "https://evilfcm.googleapis.com/abc"],
    ["bare apple domain", "https://push.apple.com/abc"],
    ["unknown host", "https://example.com/push"],
    ["not a URL", "not a url"],
    ["empty", ""],
  ])("refuses %s", (_name, endpoint) => {
    expect(isAllowedPushEndpoint(endpoint)).toBe(false);
  });
});

describe("subscriptionSchema (PUSH-05, PUSH-06)", () => {
  const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: P256DH, auth: AUTH };

  it("accepts a valid subscription", () => {
    expect(subscriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("refuses a disallowed endpoint with the browser message", () => {
    const result = subscriptionSchema.safeParse({ ...valid, endpoint: "https://localhost/x" });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toEqual([ENDPOINT_ERROR]);
  });

  it("refuses a missing endpoint with the browser message", () => {
    const result = subscriptionSchema.safeParse({ p256dh: valid.p256dh, auth: valid.auth });
    expect(result.error?.issues.map((i) => i.message)).toEqual([ENDPOINT_ERROR]);
  });

  it.each([
    ["64 bytes", b64url([0x04, ...Array.from({ length: 63 }, () => 1)])],
    ["66 bytes", b64url([0x04, ...Array.from({ length: 65 }, () => 1)])],
    ["65 bytes without the 0x04 prefix", b64url([0x03, ...Array.from({ length: 64 }, () => 1)])],
    ["not base64url", "!!!not base64url!!!"],
    ["empty", ""],
  ])("refuses p256dh with %s", (_name, p256dh) => {
    const result = subscriptionSchema.safeParse({ ...valid, p256dh });
    expect(result.error?.issues.map((i) => i.message)).toEqual([KEY_ERROR]);
  });

  it.each([
    ["15 bytes", b64url(Array.from({ length: 15 }, () => 1))],
    ["17 bytes", b64url(Array.from({ length: 17 }, () => 1))],
    ["not base64url", "a+b/c=="],
    ["empty", ""],
  ])("refuses auth with %s", (_name, auth) => {
    const result = subscriptionSchema.safeParse({ ...valid, auth });
    expect(result.error?.issues.map((i) => i.message)).toEqual([KEY_ERROR]);
  });
});

describe("preferencesSchema (PUSH-17)", () => {
  const valid = { reminder: true, due: false, security: true, admin: true, hour: 9 };

  it.each([0, 9, 23])("accepts hour %i", (hour) => {
    expect(preferencesSchema.safeParse({ ...valid, hour }).success).toBe(true);
  });

  it.each([-1, 24, 9.5, "9", null])("refuses hour %s", (hour) => {
    const result = preferencesSchema.safeParse({ ...valid, hour });
    expect(result.error?.issues.map((i) => i.message)).toEqual([PREFS_ERROR]);
  });

  it.each(["reminder", "due", "security", "admin"] as const)("refuses a non-boolean %s", (key) => {
    for (const value of ["true", 1, null]) {
      const result = preferencesSchema.safeParse({ ...valid, [key]: value });
      expect(result.error?.issues.map((i) => i.message)).toEqual([PREFS_ERROR]);
    }
  });

  it("ignores a client-sent user id (PUSH-19)", () => {
    expect(preferencesSchema.parse({ ...valid, userId: "someone-else" })).toEqual(valid);
  });
});

describe("broadcastSchema (PUSH-38)", () => {
  it("trims and accepts 1 and 140 characters", () => {
    expect(broadcastSchema.parse("  a  ")).toBe("a");
    expect(broadcastSchema.parse("a".repeat(140))).toBe("a".repeat(140));
  });

  it.each([["empty", ""], ["only spaces", "   \n\t "], ["141 characters", "a".repeat(141)]])("refuses %s", (_n, text) => {
    const result = broadcastSchema.safeParse(text);
    expect(result.error?.issues.map((i) => i.message)).toEqual([BROADCAST_ERROR]);
  });

  it("refuses a non-string", () => {
    expect(broadcastSchema.safeParse(undefined).error?.issues.map((i) => i.message)).toEqual([BROADCAST_ERROR]);
  });
});
