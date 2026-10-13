import { describe, expect, it } from "vitest";
import { loginNotice } from "./login-notice";

describe("loginNotice", () => {
  it.each([
    ["pending", "Sua conta não está liberada. Fale com o administrador"],
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

  it("explains the refused link when the e-mail already has a password account", () => {
    expect(loginNotice({ blockStatus: undefined, error: "account_not_linked" })).toBe(
      "Este e-mail já tem cadastro com senha. Entre com e-mail e senha",
    );
  });

  it("keeps the status message ahead of account_not_linked", () => {
    expect(loginNotice({ blockStatus: "pending", error: "account_not_linked" })).toBe(
      "Sua conta não está liberada. Fale com o administrador",
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
