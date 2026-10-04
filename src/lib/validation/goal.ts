import { z } from "zod";
import { ageOn, type YearMonthDay } from "@/lib/domain/freedom";
import { parseBRL } from "@/lib/domain/money";
import { isValidCalendarDate } from "@/lib/domain/month";

const MAX_INCOME_CENTS = 100_000_000;
const MAX_AGE = 120;

const saoPauloDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** Calendar day of `now` in America/Sao_Paulo. */
function today(now: Date): YearMonthDay {
  const parts = saoPauloDate.formatToParts(now);
  const get = (type: "year" | "month" | "day") => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

const isoOf = ({ year, month, day }: YearMonthDay) =>
  `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * Formulário do objetivo (textos) → valores de domínio. É função de `now` porque a idade atual
 * entra nas regras de nascimento e de idade de aposentadoria.
 */
export function goalSchema(now: Date) {
  return z
    .object({
      monthlyIncome: z.string({ error: "Informe a renda mensal desejada" }),
      saved: z.string({ error: "Informe o valor já guardado" }),
      birthDate: z.string({ error: "Informe a data de nascimento" }),
      retirementAge: z.string({ error: "Informe a idade de aposentadoria" }),
    })
    .transform((input, ctx) => {
      const fail = (path: string, message: string) => {
        ctx.addIssue({ code: "custom", path: [path], message });
        return null;
      };
      const todayDate = today(now);

      const income = parseBRL(input.monthlyIncome);
      let monthlyIncomeCents: number | null = null;
      if (!income.ok) fail("monthlyIncome", income.error);
      else if (income.value > MAX_INCOME_CENTS) fail("monthlyIncome", "A renda máxima é R$ 1.000.000,00");
      else monthlyIncomeCents = income.value;

      const saved = parseBRL(input.saved, { allowZero: true });
      const savedCents = saved.ok ? saved.value : fail("saved", saved.error);

      const birthDate = input.birthDate.trim();
      let currentAge: number | null = null;
      if (birthDate === "") fail("birthDate", "Informe a data de nascimento");
      else if (!isValidCalendarDate(birthDate)) fail("birthDate", "Data de nascimento inválida");
      else if (birthDate > isoOf(todayDate)) fail("birthDate", "A data de nascimento não pode ser futura");
      else {
        currentAge = ageOn(birthDate, todayDate);
        if (currentAge > MAX_AGE) {
          fail("birthDate", `A idade atual deve ser de no máximo ${MAX_AGE} anos`);
          currentAge = null;
        }
      }

      const ageText = input.retirementAge.trim();
      let retirementAge: number | null = null;
      if (ageText === "") fail("retirementAge", "Informe a idade de aposentadoria");
      else if (!/^\d+$/.test(ageText)) fail("retirementAge", "A idade de aposentadoria deve ser um número inteiro");
      else {
        const age = Number(ageText);
        if (age < 1 || age > MAX_AGE) {
          fail("retirementAge", `A idade de aposentadoria deve estar entre 1 e ${MAX_AGE}`);
        } else if (currentAge !== null && age <= currentAge) {
          fail("retirementAge", `A idade de aposentadoria deve ser maior que a idade atual (${currentAge})`);
        } else retirementAge = age;
      }

      if (monthlyIncomeCents === null || savedCents === null || currentAge === null || retirementAge === null) {
        return z.NEVER;
      }
      return { monthlyIncomeCents, savedCents, birthDate, retirementAge };
    });
}

export type GoalInput = z.output<ReturnType<typeof goalSchema>>;
