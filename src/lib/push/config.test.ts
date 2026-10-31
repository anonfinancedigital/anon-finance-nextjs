import { describe, expect, it } from "vitest";
import { resolveCronSecret, resolvePushConfig } from "./config";

const FULL = { VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:ops@example.com" };

describe("resolvePushConfig (PUSH-01)", () => {
  it("returns the three values when all are set", () => {
    expect(resolvePushConfig(FULL)).toEqual({ publicKey: "pub", privateKey: "priv", subject: "mailto:ops@example.com" });
  });

  it("accepts an https: subject", () => {
    expect(resolvePushConfig({ ...FULL, VAPID_SUBJECT: "https://anon.example.com" })?.subject).toBe(
      "https://anon.example.com",
    );
  });

  it.each(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const)("returns null when %s is missing", (key) => {
    const env: Record<string, string | undefined> = { ...FULL };
    delete env[key];
    expect(resolvePushConfig(env)).toBeNull();
  });

  it.each(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"] as const)("treats an empty %s as missing", (key) => {
    expect(resolvePushConfig({ ...FULL, [key]: "" })).toBeNull();
  });

  it.each(["ops@example.com", "http://anon.example.com", "tel:+5511999999999"])(
    "returns null when the subject is %s",
    (subject) => {
      expect(resolvePushConfig({ ...FULL, VAPID_SUBJECT: subject })).toBeNull();
    },
  );
});

describe("resolveCronSecret (PUSH-21)", () => {
  it("returns the secret when set", () => {
    expect(resolveCronSecret({ CRON_SECRET: "s3cret" })).toBe("s3cret");
  });

  it("returns null when unset or empty", () => {
    expect(resolveCronSecret({})).toBeNull();
    expect(resolveCronSecret({ CRON_SECRET: "" })).toBeNull();
  });
});
