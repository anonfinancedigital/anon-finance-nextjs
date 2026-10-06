import { describe, expect, it } from "vitest";
import {
  availableActions,
  fromStatuses,
  LOGIN_BLOCK_MESSAGE,
  targetStatus,
  type UserAction,
  type UserStatus,
} from "./user-status";

describe("fromStatuses / targetStatus", () => {
  it("approve moves pending, rejected and revoked to approved", () => {
    expect(fromStatuses("approve")).toEqual(["pending", "rejected", "revoked"]);
    expect(targetStatus("approve")).toBe("approved");
  });

  it("reject moves only pending to rejected", () => {
    expect(fromStatuses("reject")).toEqual(["pending"]);
    expect(targetStatus("reject")).toBe("rejected");
  });

  it("revoke moves only approved to revoked", () => {
    expect(fromStatuses("revoke")).toEqual(["approved"]);
    expect(targetStatus("revoke")).toBe("revoked");
  });

  it.each<[UserAction, UserStatus[]]>([
    ["approve", ["approved"]],
    ["reject", ["approved", "rejected", "revoked"]],
    ["revoke", ["pending", "rejected", "revoked"]],
  ])("%s does not accept an invalid origin", (action, invalid) => {
    for (const status of invalid) expect(fromStatuses(action)).not.toContain(status);
  });
});

describe("availableActions", () => {
  it.each<[UserStatus, string[]]>([
    ["approved", ["revoke", "delete"]],
    ["pending", ["approve", "reject", "delete"]],
    ["rejected", ["approve", "delete"]],
    ["revoked", ["approve", "delete"]],
  ])("%s offers %j", (status, actions) => {
    expect(availableActions(status)).toEqual(actions);
  });
});

describe("LOGIN_BLOCK_MESSAGE", () => {
  it("has the exact login messages for each blocked status", () => {
    expect(LOGIN_BLOCK_MESSAGE).toEqual({
      pending: "Sua conta está aguardando aprovação do administrador",
      rejected: "Seu cadastro não foi aprovado",
      revoked: "Seu acesso foi revogado",
    });
  });
});
