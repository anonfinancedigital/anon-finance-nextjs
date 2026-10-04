import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UNAUTHORIZED } from "@/lib/action-result";
import { auth } from "@/lib/auth";

async function currentUserId(): Promise<string | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  return result?.user.id ?? null;
}

/** For pages: the signed-in user, or a redirect to /login. */
export async function requireSessionForPage(): Promise<{ userId: string }> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  return { userId };
}

/** For Server Actions: the signed-in user, or UNAUTHORIZED without touching any data. */
export async function requireSessionForAction(): Promise<
  { ok: true; userId: string } | { ok: false; error: typeof UNAUTHORIZED }
> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: UNAUTHORIZED };
  return { ok: true, userId };
}
