import { brToIso } from "@/lib/domain/date-br";
import { ageOn, type YearMonthDay } from "@/lib/domain/freedom";
import type { Result } from "@/lib/domain/result";

export const MAX_AGE = 120;

const saoPauloDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** Calendar day of `now` in America/Sao_Paulo. */
export function today(now: Date): YearMonthDay {
  const parts = saoPauloDate.formatToParts(now);
  const get = (type: "year" | "month" | "day") => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export const isoOf = ({ year, month, day }: YearMonthDay) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** Birth date text "DD/MM/AAAA" into its ISO form and current age; the error is the user-facing message. */
export function parseBirthDate(text: string, now: Date): Result<{ iso: string; age: number }> {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, error: "Informe a data de nascimento" };
  const iso = brToIso(trimmed);
  if (iso === null) return { ok: false, error: "Data de nascimento inválida" };
  const todayDate = today(now);
  if (iso > isoOf(todayDate)) return { ok: false, error: "A data de nascimento não pode ser futura" };
  const age = ageOn(iso, todayDate);
  if (age > MAX_AGE) return { ok: false, error: `A idade atual deve ser de no máximo ${MAX_AGE} anos` };
  return { ok: true, value: { iso, age } };
}

/**
 * Error message when a new current `age` reaches the independence age of the saved goal, `null` when it
 * is compatible (or there is no goal).
 */
export function birthDateGoalConflict(age: number, retirementAge: number | null): string | null {
  if (retirementAge === null || age < retirementAge) return null;
  return `A nova data deixa a idade atual igual ou maior que a idade da independência do seu objetivo (${retirementAge})`;
}
