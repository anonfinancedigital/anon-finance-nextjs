"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveBirthDateSealed } from "@/actions/profile-sealed";
import { LOAD_ERROR_MESSAGE, useOpened } from "@/components/use-opened";
import { useVault } from "@/components/vault-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ActionResult, SAVE_FAILED } from "@/lib/action-result";
import { isoToBR, maskDateInput } from "@/lib/domain/date-br";
import { birthDateGoalConflict, parseBirthDate } from "@/lib/validation/birth-date";
import { openBirthDate, openGoal } from "@/lib/vault/open";
import { sealBirthDate } from "@/lib/vault/seal";
import type { Ct, GoalDto } from "@/lib/vault/types";

const UPDATED_MESSAGE = "Data de nascimento atualizada";

const fieldError = (message: string): ActionResult => ({
  ok: false,
  error: message,
  fieldErrors: { birthDate: message },
});

/**
 * Birth date form. Opens the saved date (to fill the field) and the goal's retirement age in the
 * browser, checks the date and the age rule here and sends only the sealed date. A first-time date
 * sends the user to /; changing an existing one stays here with a confirmation.
 */
export function BirthDateForm({ birthDateCt, goalDto }: { birthDateCt: Ct | null; goalDto: GoalDto | null }) {
  const router = useRouter();
  const { dek, userId } = useVault();
  const opened = useOpened(
    async (key, owner) => {
      const iso = await openBirthDate(key, owner, birthDateCt);
      const goal = goalDto ? await openGoal(key, owner, goalDto, iso ?? "") : null;
      return { initial: iso === null ? "" : isoToBR(iso), retirementAge: goal?.retirementAge ?? null };
    },
    [birthDateCt, goalDto],
  );
  // Null until the user types: the field shows the opened date meanwhile.
  const [typed, setTyped] = useState<string | null>(null);
  const [state, setState] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (opened.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{LOAD_ERROR_MESSAGE}</AlertDescription>
      </Alert>
    );
  }

  const birthDate = typed ?? opened.data?.initial ?? "";
  const fieldErrorText = state && !state.ok ? state.fieldErrors?.birthDate : undefined;
  const generalError = state && !state.ok && !state.fieldErrors ? state.error : undefined;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !opened.data) return;
    // Same rules and messages the server used to apply, checked before anything is sealed (SIGILO-09).
    const parsed = parseBirthDate(birthDate, new Date());
    if (!parsed.ok) {
      setState(fieldError(parsed.error));
      return;
    }
    const { retirementAge } = opened.data;
    const conflict = birthDateGoalConflict(parsed.value.age, retirementAge);
    if (conflict) {
      setState(fieldError(conflict));
      return;
    }
    startTransition(async () => {
      let res: ActionResult;
      try {
        res = await saveBirthDateSealed(await sealBirthDate(dek, userId, parsed.value.iso));
      } catch {
        res = { ok: false, error: SAVE_FAILED };
      }
      if (res.ok && birthDateCt === null) {
        router.push("/");
        return;
      }
      setState(res);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="birthDate">Data de nascimento</Label>
        <Input
          id="birthDate"
          name="birthDate"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoComplete="bday"
          required
          value={birthDate}
          onChange={(event) => setTyped(maskDateInput(event.target.value))}
          aria-invalid={!!fieldErrorText}
        />
        {fieldErrorText && <p className="text-sm text-destructive">{fieldErrorText}</p>}
      </div>
      {generalError && (
        <p role="alert" className="text-sm text-destructive">
          {generalError}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm">
          {UPDATED_MESSAGE}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending || opened.loading}>
        Salvar
      </Button>
    </form>
  );
}
