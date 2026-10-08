import { z } from "zod";
import { parseBRL } from "@/lib/domain/money";
import type { Result } from "@/lib/domain/result";
import { MAX_AGE, parseBirthDate, today } from "@/lib/validation/birth-date";

export { today };

const MAX_INCOME_CENTS = 100_000_000;
const MIN_RATE_BP = 100;
const MAX_RATE_BP = 1500;
const RATE_FORMAT_MESSAGE = "Informe a taxa com até 2 casas decimais, ex.: 6,5";
const ANNUAL_RATE_RANGE_MESSAGE = "A rentabilidade deve estar entre 1% e 15% ao ano";
const WITHDRAWAL_RATE_RANGE_MESSAGE = "A taxa de retirada deve estar entre 1% e 15% ao ano";
const WITHDRAWAL_ABOVE_ANNUAL_MESSAGE = "A taxa de retirada não pode ser maior que a rentabilidade";

// Digits with up to 2 decimals after a comma or a dot: "6", "6,5", "6.75".
const RATE_PATTERN = /^(\d+)(?:[.,](\d{1,2}))?$/;

/** Rate text in % a.a. ("6,5" or "6.5") into basis points (650); empty, non-numeric or 3+ decimals fail. */
export function parseRate(text: string): Result<number> {
  const match = RATE_PATTERN.exec(text.trim());
  if (!match) return { ok: false, error: RATE_FORMAT_MESSAGE };
  const [, whole, fraction = ""] = match;
  return { ok: true, value: Number(whole) * 100 + Number(fraction.padEnd(2, "0")) };
}

/**
 * Formulário do objetivo (textos) → valores de domínio. É função de `now` porque a idade atual
 * entra nas regras de nascimento e de idade da independência.
 */
export function goalSchema(now: Date) {
  return z
    .object({
      monthlyIncome: z.string({ error: "Informe a renda mensal desejada" }),
      saved: z.string({ error: "Informe o valor já guardado" }),
      birthDate: z.string({ error: "Informe a data de nascimento" }),
      retirementAge: z.string({ error: "Informe a idade da independência" }),
      annualRate: z.string({ error: RATE_FORMAT_MESSAGE }),
      withdrawalRate: z.string({ error: RATE_FORMAT_MESSAGE }),
    })
    .transform((input, ctx) => {
      const fail = (path: string, message: string) => {
        ctx.addIssue({ code: "custom", path: [path], message });
        return null;
      };

      const income = parseBRL(input.monthlyIncome);
      let monthlyIncomeCents: number | null = null;
      if (!income.ok) fail("monthlyIncome", income.error);
      else if (income.value > MAX_INCOME_CENTS) fail("monthlyIncome", "A renda máxima é R$ 1.000.000,00");
      else monthlyIncomeCents = income.value;

      const saved = parseBRL(input.saved, { allowZero: true });
      const savedCents = saved.ok ? saved.value : fail("saved", saved.error);

      const birth = parseBirthDate(input.birthDate, now);
      const birthDate = birth.ok ? birth.value.iso : null;
      const currentAge = birth.ok ? birth.value.age : null;
      if (!birth.ok) fail("birthDate", birth.error);

      const ageText = input.retirementAge.trim();
      let retirementAge: number | null = null;
      if (ageText === "") fail("retirementAge", "Informe a idade da independência");
      else if (!/^\d+$/.test(ageText)) fail("retirementAge", "A idade da independência deve ser um número inteiro");
      else {
        const age = Number(ageText);
        if (age < 1 || age > MAX_AGE) {
          fail("retirementAge", `A idade da independência deve estar entre 1 e ${MAX_AGE}`);
        } else if (currentAge !== null && age <= currentAge) {
          fail("retirementAge", `A idade da independência deve ser maior que a idade atual (${currentAge})`);
        } else retirementAge = age;
      }

      const rate = (path: string, text: string, rangeMessage: string) => {
        const parsed = parseRate(text);
        if (!parsed.ok) return fail(path, parsed.error);
        if (parsed.value < MIN_RATE_BP || parsed.value > MAX_RATE_BP) return fail(path, rangeMessage);
        return parsed.value;
      };
      const annualRateBp = rate("annualRate", input.annualRate, ANNUAL_RATE_RANGE_MESSAGE);
      let withdrawalRateBp = rate("withdrawalRate", input.withdrawalRate, WITHDRAWAL_RATE_RANGE_MESSAGE);
      if (annualRateBp !== null && withdrawalRateBp !== null && withdrawalRateBp > annualRateBp) {
        withdrawalRateBp = fail("withdrawalRate", WITHDRAWAL_ABOVE_ANNUAL_MESSAGE);
      }

      if (
        monthlyIncomeCents === null ||
        savedCents === null ||
        birthDate === null ||
        currentAge === null ||
        retirementAge === null ||
        annualRateBp === null ||
        withdrawalRateBp === null
      ) {
        return z.NEVER;
      }
      return { monthlyIncomeCents, savedCents, birthDate, retirementAge, annualRateBp, withdrawalRateBp };
    });
}

export type GoalInput = z.output<ReturnType<typeof goalSchema>>;
