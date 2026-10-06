import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UNAUTHORIZED } from "@/lib/action-result";
import { isAdminEmail } from "@/lib/admin";
import { auth } from "@/lib/auth";

/** The signed-in user when approved; a session of any other status counts as no session. */
async function currentUser(): Promise<{ id: string; isAdmin: boolean } | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result || result.user.status !== "approved") return null;
  return { id: result.user.id, isAdmin: isAdminEmail(result.user.email) };
}

/** For pages: the signed-in approved user, or a redirect to /login. */
export async function requireSessionForPage(): Promise<{ userId: string; isAdmin: boolean }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return { userId: user.id, isAdmin: user.isAdmin };
}

/** For Server Actions: the signed-in approved user, or UNAUTHORIZED without touching any data. */
export async function requireSessionForAction(): Promise<
  { ok: true; userId: string } | { ok: false; error: typeof UNAUTHORIZED }
> {
  const user = await currentUser();
  if (!user) return { ok: false, error: UNAUTHORIZED };
  return { ok: true, userId: user.id };
}

/** For admin pages: the admin, a redirect to /login without a session, or to / for anyone else. */
export async function requireAdminForPage(): Promise<{ userId: string }> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");
  return { userId: user.id };
}

/** For admin Server Actions: the admin, or UNAUTHORIZED without touching any data. */
export async function requireAdminForAction(): Promise<
  { ok: true; userId: string } | { ok: false; error: typeof UNAUTHORIZED }
> {
  const user = await currentUser();
  if (!user?.isAdmin) return { ok: false, error: UNAUTHORIZED };
  return { ok: true, userId: user.id };
}
