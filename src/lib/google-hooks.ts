import type { UserStatus } from "@/lib/domain/user-status";

/**
 * Better Auth `user.create.before` rule for sign-ups that reach the adapter (only Google: password
 * sign-ups insert through Drizzle). Refuses an unverified e-mail; otherwise always creates `approved`:
 * Google already authenticated a real identity and the vault password is enforced by the guard.
 */
export function googleUserCreateDecision(user: {
  emailVerified: boolean;
  status?: unknown;
}): false | { data: { status: "approved" } } {
  return user.emailVerified ? { data: { status: "approved" } } : false;
}

/** Status to store in the login block cookie when a session is refused; null when it is not. */
export function blockCookieStatus(status: UserStatus): Exclude<UserStatus, "approved"> | null {
  return status === "approved" ? null : status;
}
