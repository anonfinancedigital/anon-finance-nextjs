import { describe, expect, it } from "vitest";
import { summarize } from "@/lib/domain/freedom";
import { BLANK_GOAL_VALUES, evaluateDraft, type GoalFormValues, withZeroSaved } from "./goal-draft";

// 2026-06-15 12:00 em São Paulo; cenário de aceite: nascido em 10/05/1993 (33 anos), ápice aos 48.
const now = new Date("2026-06-15T15:00:00Z");
const savedValues: GoalFormValues = {
  monthlyIncome: "20.000,00",
  saved: "565.000,00",
  birthDate: "10/05/1993",
  retirementAge: "48",
  annualRate: "8",
  withdrawalRate: "5",
};
const savedGoal = {
  monthlyIncomeCents: 2_000_000,
  savedCents: 56_500_000,
  birthDate: "1993-05-10",
  retirementAge: 48,
  annualRateBp: 800,
  withdrawalRateBp: 500,
};
const savedSummary = summarize(savedGoal, now);

describe("evaluateDraft com valores válidos", () => {
  it("devolve o resumo do mesmo objetivo e nenhum erro", () => {
    const draft = evaluateDraft(savedValues, savedValues, now, null);
    expect(draft.summary).toEqual(savedSummary);
    expect(draft.errors).toEqual({});
  });

  it("uma renda diferente muda o resumo para o do novo objetivo, ignorando o anterior", () => {
    const edited = { ...savedValues, monthlyIncome: "25.000,00" };
    const draft = evaluateDraft(edited, savedValues, now, savedSummary);
    expect(draft.summary).toEqual(summarize({ ...savedGoal, monthlyIncomeCents: 2_500_000 }, now));
    expect(draft.summary).not.toEqual(savedSummary);
    expect(draft.errors).toEqual({});
  });
});

describe("evaluateDraft com valores inválidos", () => {
  it("nascimento futuro: erro do goalSchema no campo e o resumo anterior mantido", () => {
    const edited = { ...savedValues, birthDate: "10/05/2030" };
    const draft = evaluateDraft(edited, savedValues, now, savedSummary);
    expect(draft.errors).toEqual({ birthDate: "A data de nascimento não pode ser futura" });
    expect(draft.summary).toBe(savedSummary);
  });

  it("vários campos inválidos: um erro por campo", () => {
    const edited = { ...savedValues, birthDate: "31/02/1993", monthlyIncome: "" };
    const draft = evaluateDraft(edited, savedValues, now, savedSummary);
    expect(draft.errors.birthDate).toBe("Data de nascimento inválida");
    expect(draft.errors.monthlyIncome).toBe("Informe o valor");
    expect(draft.summary).toBe(savedSummary);
  });
});

describe("evaluateDraft: dirty", () => {
  it("valores iguais aos salvos não são alteração", () => {
    expect(evaluateDraft(savedValues, savedValues, now, savedSummary).dirty).toBe(false);
  });

  it("digitar e desfazer volta a não ser alteração", () => {
    const typed = evaluateDraft({ ...savedValues, saved: "565.000,01" }, savedValues, now, savedSummary);
    expect(typed.dirty).toBe(true);
    const undone = evaluateDraft({ ...savedValues, saved: "565.000,00" }, savedValues, now, typed.summary);
    expect(undone.dirty).toBe(false);
  });

  it.each(Object.keys(savedValues) as (keyof GoalFormValues)[])("%s diferente dos salvos é alteração", (field) => {
    const edited = { ...savedValues, [field]: `${savedValues[field]}1` };
    expect(evaluateDraft(edited, savedValues, now, savedSummary).dirty).toBe(true);
  });

  it("uma alteração inválida também conta como alteração", () => {
    const edited = { ...savedValues, birthDate: "10/05/2030" };
    expect(evaluateDraft(edited, savedValues, now, savedSummary).dirty).toBe(true);
  });
});

describe("evaluateDraft sem objetivo salvo", () => {
  it("formulário em branco: sem resumo e sem alteração", () => {
    const draft = evaluateDraft(BLANK_GOAL_VALUES, null, now, null);
    expect(draft.summary).toBeNull();
    expect(draft.dirty).toBe(false);
  });

  it("renda preenchida e idade vazia: sem resumo e com alteração", () => {
    const draft = evaluateDraft({ ...BLANK_GOAL_VALUES, monthlyIncome: "20.000,00" }, null, now, null);
    expect(draft.summary).toBeNull();
    expect(draft.dirty).toBe(true);
  });

  it("o cenário Moderado é o padrão do formulário em branco", () => {
    expect(BLANK_GOAL_VALUES.annualRate).toBe("8");
    expect(BLANK_GOAL_VALUES.withdrawalRate).toBe("5");
  });

  it("tudo preenchido e válido: resumo igual ao do objetivo e alteração", () => {
    const draft = evaluateDraft(savedValues, null, now, null);
    expect(draft.summary).toEqual(savedSummary);
    expect(draft.dirty).toBe(true);
  });

  it("apagar a renda depois de um resumo válido volta ao aviso, sem reaproveitar o anterior", () => {
    const draft = evaluateDraft({ ...savedValues, monthlyIncome: "" }, null, now, savedSummary);
    expect(draft.summary).toBeNull();
    expect(draft.errors.monthlyIncome).toBe("Informe o valor");
  });
});

describe("guardado vazio vale R$ 0 (APICE-19.4)", () => {
  const zeroSaved = summarize({ ...savedGoal, savedCents: 0 }, now);

  it("sem nada guardado, renda e idade válidas dão o resumo de R$ 0 e nenhum erro em saved", () => {
    const draft = evaluateDraft({ ...savedValues, saved: "" }, null, now, null);
    expect(draft.summary).toEqual(zeroSaved);
    expect(draft.errors.saved).toBeUndefined();
    expect(draft.errors).toEqual({});
  });

  it("guardado só com espaços também vale R$ 0", () => {
    expect(evaluateDraft({ ...savedValues, saved: "  " }, null, now, null).summary).toEqual(zeroSaved);
  });

  it("guardado vazio e \"0,00\" valem o mesmo: dirty false (APICE-14.7)", () => {
    const blankSaved = { ...savedValues, saved: "" };
    const zeroSavedValues = { ...savedValues, saved: "0,00" };
    expect(evaluateDraft(blankSaved, zeroSavedValues, now, null).dirty).toBe(false);
    expect(evaluateDraft(zeroSavedValues, blankSaved, now, null).dirty).toBe(false);
    expect(evaluateDraft(blankSaved, blankSaved, now, null).dirty).toBe(false);
  });

  it("dirty true quando o guardado realmente difere (APICE-14.6)", () => {
    const zeroSavedValues = { ...savedValues, saved: "0,00" };
    expect(evaluateDraft({ ...savedValues, saved: "" }, savedValues, now, null).dirty).toBe(true);
    expect(evaluateDraft({ ...savedValues, saved: "1,00" }, zeroSavedValues, now, null).dirty).toBe(true);
  });

  it("um guardado inválido continua com erro", () => {
    expect(evaluateDraft({ ...savedValues, saved: "abc" }, null, now, null).errors.saved).toBe(
      "Valor inválido. Use o formato 1.234,56",
    );
  });

  it("withZeroSaved troca guardado vazio ou em branco por 0,00 e preserva o resto", () => {
    expect(withZeroSaved({ ...savedValues, saved: "" })).toEqual({ ...savedValues, saved: "0,00" });
    expect(withZeroSaved({ ...savedValues, saved: "  " })).toEqual({ ...savedValues, saved: "0,00" });
    expect(withZeroSaved(savedValues)).toEqual(savedValues);
  });
});
