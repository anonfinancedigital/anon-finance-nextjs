import { createECDH, randomBytes } from "node:crypto";
import webpush, { WebPushError } from "web-push";
import { describe, expect, it } from "vitest";

// Pins the web-push API shape that sendPush (design.md) relies on, so a library upgrade that changes it fails here.

function browserSubscription() {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/contract-test",
    keys: {
      p256dh: ecdh.getPublicKey().toString("base64url"),
      auth: randomBytes(16).toString("base64url"),
    },
  };
}

describe("web-push contract (PUSH-29)", () => {
  it("builds the request with TTL, a VAPID Authorization and the aes128gcm encoding", () => {
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();
    const details = webpush.generateRequestDetails(browserSubscription(), '{"title":"ANON"}', {
      TTL: 86400,
      vapidDetails: { subject: "mailto:ops@example.com", publicKey, privateKey },
    });

    expect(details.method).toBe("POST");
    expect(details.endpoint).toBe("https://fcm.googleapis.com/fcm/send/contract-test");
    // The library stores TTL as a number; HTTP serialises it to "86400".
    expect(String(details.headers.TTL)).toBe("86400");
    expect(details.headers.Authorization).toMatch(/^vapid /);
    expect(details.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(Buffer.isBuffer(details.body)).toBe(true);
  });

  it("exposes the HTTP status of a push-service rejection as WebPushError.statusCode", () => {
    for (const status of [404, 410]) {
      const error = new WebPushError("Received unexpected response code", status, {}, "", "https://x");
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(status);
    }
  });
});
