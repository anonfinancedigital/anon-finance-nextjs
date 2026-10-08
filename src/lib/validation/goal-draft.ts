import { DEFAULT_ANNUAL_RATE_BP, DEFAULT_WITHDRAWAL_RATE_BP, summarize, type GoalSummary } from "@/lib/domain/freedom";
import { goalSchema } from "./goal";

export type GoalFormValues = {
  /** pt-BR text, e.g. "10.000,00". */
  monthlyIncome: string;
  /** pt-BR text, e.g. "150.000,00". */
  saved: string;
  /** DD/MM/AAAA. */
  birthDate: string;
  retirementAge: string;
  /** Real return in % a.a., pt-BR text, e.g. "8" or "6,5". */
  annualRate: string;
  /** Withdrawal rate in % a.a., pt-BR text, e.g. "6" or "4,5". */
  withdrawalRate: string;
};

/** Valores do formulário sem objetivo salvo: campos vazios e o cenário Moderado (8% real, retirada 5%). */
export const BLANK_GOAL_VALUES: GoalFormValues = {
  monthlyIncome: "",
  saved: "",
  birthDate: "",
  retirementAge: "",
  annualRate: String(DEFAULT_ANNUAL_RATE_BP / 100),
  withdrawalRate: String(DEFAULT_WITHDRAWAL_RATE_BP / 100),
};

export type GoalDraft = {
  /** Resumo do rascunho; ver `evaluateDraft` para o que acontece com valores inválidos. */
  summary: GoalSummary | null;
  /** Mensagem do `goalSchema` por campo inválido; cabe à tela mostrar só os campos tocados. */
  errors: Partial<Record<keyof GoalFormValues, string>>;
  /** Os valores diferem dos salvos (ou do formulário em branco, sem objetivo salvo), comparados por valor. */
  dirty: boolean;
};

/** "Guardado" vazio vale R$ 0 (quem não tem nada guardado não digita 0: a máscara apaga zeros). */
export function withZeroSaved(values: GoalFormValues): GoalFormValues {
  return values.saved.trim() === "" ? { ...values, saved: "0,00" } : values;
}

/** Campos editáveis; `birthDate` vem do usuário e não conta como alteração. */
const FIELDS = (Object.keys(BLANK_GOAL_VALUES) as (keyof GoalFormValues)[]).filter((field) => field !== "birthDate");

/**
 * Avalia o rascunho do objetivo com o mesmo `goalSchema` e `summarize` do servidor. Valores válidos
 * dão o resumo novo. Inválidos mantêm o resumo anterior quando há objetivo salvo e o descartam
 * (`null`) quando não há, para a tela vazia voltar ao aviso de preenchimento.
 */
export function evaluateDraft(
  values: GoalFormValues,
  saved: GoalFormValues | null,
  now: Date,
  previous: GoalSummary | null,
): GoalDraft {
  const baseline = saved ?? BLANK_GOAL_VALUES;
  const current = withZeroSaved(values);
  const reference = withZeroSaved(baseline);
  const dirty = FIELDS.some((field) => current[field] !== reference[field]);

  const parsed = goalSchema(now).safeParse(current);
  if (parsed.success) return { summary: summarize(parsed.data, now), errors: {}, dirty };

  const errors: GoalDraft["errors"] = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof GoalFormValues;
    errors[field] ??= issue.message;
  }
  return { summary: saved === null ? null : previous, errors, dirty };
}
