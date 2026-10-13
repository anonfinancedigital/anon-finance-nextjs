// Pure and isomorphic (used by the server and by the admin list UI): no server imports here.

export type UserStatus = "pending" | "approved" | "rejected" | "revoked";

export type UserAction = "reactivate" | "revoke";

const TRANSITIONS: Record<UserAction, { from: UserStatus[]; to: UserStatus }> = {
  reactivate: { from: ["revoked"], to: "approved" },
  revoke: { from: ["approved"], to: "revoked" },
};

/** Statuses from which the action is a valid transition. */
export function fromStatuses(action: UserAction): UserStatus[] {
  return [...TRANSITIONS[action].from];
}

/** Status the user ends in after the action. */
export function targetStatus(action: UserAction): UserStatus {
  return TRANSITIONS[action].to;
}

/** Admin actions shown for a user in the given status. */
export function availableActions(status: UserStatus): (UserAction | "delete")[] {
  switch (status) {
    case "approved":
      return ["revoke", "delete"];
    case "revoked":
      return ["reactivate", "delete"];
    case "pending":
    case "rejected":
      return ["delete"];
  }
}

/** Login message shown (only with the right password) to a user who cannot sign in yet. */
export const LOGIN_BLOCK_MESSAGE: Record<Exclude<UserStatus, "approved">, string> = {
  pending: "Sua conta não está liberada. Fale com o administrador",
  rejected: "Seu cadastro não foi aprovado",
  revoked: "Seu acesso foi revogado",
};
