"use client";

import { useActionState, useState } from "react";
import { saveBirthDateAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskDateInput } from "@/lib/domain/date-br";

const UPDATED_MESSAGE = "Data de nascimento atualizada";

/** Birth date form; `initial` is the saved date as DD/MM/AAAA, or empty when none was given yet. */
export function BirthDateForm({ initial }: { initial: string }) {
  const [state, formAction, pending] = useActionState(saveBirthDateAction, undefined);
  const [birthDate, setBirthDate] = useState(initial);

  const fieldError = state && !state.ok ? state.fieldErrors?.birthDate : undefined;
  const generalError = state && !state.ok && !state.fieldErrors ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-4">
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
          onChange={(event) => setBirthDate(maskDateInput(event.target.value))}
          aria-invalid={!!fieldError}
        />
        {fieldError && <p className="text-sm text-destructive">{fieldError}</p>}
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
      <Button type="submit" className="w-full" disabled={pending}>
        Salvar
      </Button>
    </form>
  );
}
