"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { requireSessionForAction } from "@/lib/auth-guard";
import { goalsRepo } from "@/lib/db/repos/goals";
import { usersRepo } from "@/lib/db/repos/users";
import { parseBirthDate } from "@/lib/validation/birth-date";

const fieldError = (message: string): ActionResult => ({
  ok: false,
  error: message,
  fieldErrors: { birthDate: message },
});

/**
 * Birth date form action (useActionState): saves the user's own birth date.
 * A first-time date sends the user to /; changing an existing one answers `{ ok: true }`.
 */
export async function saveBirthDateAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireSessionForAction();
  if (!session.ok) return session;

  const parsed = parseBirthDate(String(formData.get("birthDate") ?? ""), new Date());
  if (!parsed.ok) return fieldError(parsed.error);

  let hadDate: boolean;
  try {
    const goal = await goalsRepo.get(session.userId);
    if (goal && parsed.value.age >= goal.retirementAge) {
      return fieldError(
        `A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (${goal.retirementAge})`,
      );
    }
    hadDate = (await usersRepo.getBirthDate(session.userId)) !== null;
    await usersRepo.setBirthDate(session.userId, parsed.value.iso);
  } catch (error) {
    console.error("saveBirthDateAction", error);
    return { ok: false, error: SAVE_FAILED };
  }

  revalidatePath("/liberdade");
  if (!hadDate) redirect("/");
  return { ok: true };
}
