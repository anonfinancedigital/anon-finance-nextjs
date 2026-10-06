// Pure and isomorphic (used by the server and by the admin list UI): no server imports here.

export type UserStatus = "pending" | "approved" | "rejected" | "revoked";

export type UserAction = "approve" | "reject" | "revoke";

const TRANSITIONS: Record<UserAction, { from: UserStatus[]; to: UserStatus }> = {
  approve: { from: ["pending", "rejected", "revoked"], to: "approved" },
  reject: { from: ["pending"], to: "rejected" },
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
    case "pending":
      return ["approve", "reject", "delete"];
    case "rejected":
    case "revoked":
      return ["approve", "delete"];
  }
}

/** Login message shown (only with the right password) to a user who cannot sign in yet. */
export const LOGIN_BLOCK_MESSAGE: Record<Exclude<UserStatus, "approved">, string> = {
  pending: "Sua conta está aguardando aprovação do administrador",
  rejected: "Seu cadastro não foi aprovado",
  revoked: "Seu acesso foi revogado",
};
