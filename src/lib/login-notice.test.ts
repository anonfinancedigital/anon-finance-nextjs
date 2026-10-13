import { describe, expect, it } from "vitest";
import { loginNotice } from "./login-notice";

describe("loginNotice", () => {
  it.each([
    ["pending", "Sua conta está aguardando aprovação do administrador"],
    ["rejected", "Seu cadastro não foi aprovado"],
    ["revoked", "Seu acesso foi revogado"],
  ])("shows the message of the blocked status %s", (blockStatus, message) => {
    expect(loginNotice({ blockStatus, error: undefined })).toBe(message);
  });

  it("shows the status message even when an error is also present", () => {
    expect(loginNotice({ blockStatus: "revoked", error: "access_denied" })).toBe("Seu acesso foi revogado");
  });

  it("shows the generic Google message for an error without a blocked status", () => {
    expect(loginNotice({ blockStatus: undefined, error: "access_denied" })).toBe(
      "Não foi possível entrar com o Google",
    );
  });

  it("returns null with neither status nor error", () => {
    expect(loginNotice({ blockStatus: undefined, error: undefined })).toBeNull();
  });

  it.each(["approved", "texto livre", ""])("ignores the unknown cookie value %j and falls back to the error", (value) => {
    expect(loginNotice({ blockStatus: value, error: "x" })).toBe("Não foi possível entrar com o Google");
    expect(loginNotice({ blockStatus: value, error: undefined })).toBeNull();
  });
});
