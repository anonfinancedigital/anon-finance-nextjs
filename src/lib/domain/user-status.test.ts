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
  it("reactivate moves only revoked to approved", () => {
    expect(fromStatuses("reactivate")).toEqual(["revoked"]);
    expect(targetStatus("reactivate")).toBe("approved");
  });

  it("revoke moves only approved to revoked", () => {
    expect(fromStatuses("revoke")).toEqual(["approved"]);
    expect(targetStatus("revoke")).toBe("revoked");
  });

  it.each<[UserAction, UserStatus[]]>([
    ["reactivate", ["pending", "approved", "rejected"]],
    ["revoke", ["pending", "rejected", "revoked"]],
  ])("%s does not accept an invalid origin", (action, invalid) => {
    for (const status of invalid) expect(fromStatuses(action)).not.toContain(status);
  });
});

describe("availableActions", () => {
  it.each<[UserStatus, string[]]>([
    ["approved", ["revoke", "delete"]],
    ["pending", ["delete"]],
    ["rejected", ["delete"]],
    ["revoked", ["reactivate", "delete"]],
  ])("%s offers %j", (status, actions) => {
    expect(availableActions(status)).toEqual(actions);
  });
});

describe("LOGIN_BLOCK_MESSAGE", () => {
  it("has the exact login messages for each blocked status", () => {
    expect(LOGIN_BLOCK_MESSAGE).toEqual({
      pending: "Sua conta não está liberada. Fale com o administrador",
      rejected: "Seu cadastro não foi aprovado",
      revoked: "Seu acesso foi revogado",
    });
  });
});
