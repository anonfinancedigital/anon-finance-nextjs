import { shiftMonth, type YearMonth } from "./month";

export type StepId = "categories" | "transaction" | "goal";
export type MonthState = "first-access" | "empty-month" | "has-data";

export type SetupStep = { id: StepId; label: string; done: boolean };
export type Setup = {
  steps: SetupStep[];
  doneCount: number;
  currentId: StepId | null;
  complete: boolean;
};

/** Checklist "Comece por aqui": the current step is the first pending one. */
export function deriveSetup(input: {
  categories: number;
  transactions: number;
  hasGoal: boolean;
}): Setup {
  const steps: SetupStep[] = [
    { id: "categories", label: "Definir sua receita e categorias", done: input.categories >= 1 },
    { id: "transaction", label: "Registrar sua primeira transação", done: input.transactions >= 1 },
    { id: "goal", label: "Definir sua meta", done: input.hasGoal },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return {
    steps,
    doneCount,
    currentId: steps.find((s) => !s.done)?.id ?? null,
    complete: doneCount === steps.length,
  };
}

/** First access = no transaction in any month; empty month = history exists elsewhere. */
export function deriveMonthState(input: {
  monthTransactions: number;
  totalTransactions: number;
}): MonthState {
  if (input.totalTransactions === 0) return "first-access";
  return input.monthTransactions === 0 ? "empty-month" : "has-data";
}

export function previousMonth(m: YearMonth): YearMonth {
  return shiftMonth(m, -1);
}

const longMonth = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });

/** Lowercase pt-BR month name, without the year (e.g. `setembro`). */
export function monthLongName({ year, month }: YearMonth): string {
  return longMonth.format(new Date(Date.UTC(year, month - 1, 1)));
}
