import type { UserStatus } from "@/lib/domain/user-status";

/**
 * Better Auth `user.create.before` rule for sign-ups that reach the adapter (only Google: password
 * sign-ups insert through Drizzle). Refuses an unverified e-mail; otherwise always creates `pending`.
 */
export function googleUserCreateDecision(user: {
  emailVerified: boolean;
  status?: unknown;
}): false | { data: { status: "pending" } } {
  return user.emailVerified ? { data: { status: "pending" } } : false;
}

/** Status to store in the login block cookie when a session is refused; null when it is not. */
export function blockCookieStatus(status: UserStatus): Exclude<UserStatus, "approved"> | null {
  return status === "approved" ? null : status;
}
