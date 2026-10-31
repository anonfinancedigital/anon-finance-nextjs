import { describe, expect, it } from "vitest";
import { PUSH_TEXT, PUSH_TITLE, PUSH_TTL, pushPayload } from "./push-messages";

describe("push messages", () => {
  it("uses the exact fixed texts of the spec (PUSH-24, 25, 33, 34)", () => {
    expect(PUSH_TEXT.reminder).toBe("Que tal registrar seus gastos de hoje?");
    expect(PUSH_TEXT.due).toBe("Você tem lançamentos recorrentes para hoje.");
    expect(PUSH_TEXT.passwordReset).toBe("Sua senha foi redefinida.");
    expect(PUSH_TEXT.revoked).toBe("Seu acesso ao ANON foi revogado.");
  });

  it("uses the generic fallback text of the service worker (PUSH-43)", () => {
    expect(PUSH_TEXT.generic).toBe("Você tem uma nova notificação.");
  });

  it("always titles notifications ANON (PUSH-29)", () => {
    expect(PUSH_TITLE).toBe("ANON");
  });

  it("keeps a push for a day at most (PUSH-29)", () => {
    expect(PUSH_TTL).toBe(86400);
  });

  it("builds the JSON payload with title, body and url only (PUSH-29)", () => {
    expect(pushPayload("x")).toBe('{"title":"ANON","body":"x","url":"/"}');
  });

  it("escapes the body so the payload stays valid JSON", () => {
    const body = 'say "hi"\n';
    expect(JSON.parse(pushPayload(body))).toEqual({ title: "ANON", body, url: "/" });
  });
});
