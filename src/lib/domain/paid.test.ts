import { describe, expect, it } from "vitest";
import { applyPaid, countedNetByDay, countsInTotals, orderByPaid, paidActionLabel, paidLabel, startsDay } from "./paid";

type Row = { id: string; date: string; kind: "income" | "expense"; amountCents: number; recurring: boolean; paid?: boolean | null };

const avulso = (id: string, date = "2026-11-10", amountCents = 1_000, kind: Row["kind"] = "expense"): Row => ({
  id,
  date,
  kind,
  amountCents,
  recurring: false,
  paid: null,
});
const pago = (id: string, date = "2026-11-10", amountCents = 1_000, kind: Row["kind"] = "expense"): Row => ({
  id,
  date,
  kind,
  amountCents,
  recurring: true,
  paid: true,
});
const naoPago = (id: string, date = "2026-11-10", amountCents = 1_000, kind: Row["kind"] = "expense"): Row => ({
  id,
  date,
  kind,
  amountCents,
  recurring: true,
  paid: false,
});

describe("countsInTotals (PAGO-05)", () => {
  it("avulso conta, com qualquer valor de paid", () => {
    expect(countsInTotals({ recurring: false, paid: null })).toBe(true);
    expect(countsInTotals({ recurring: false, paid: false })).toBe(true);
    expect(countsInTotals({ recurring: false })).toBe(true);
  });

  it("recorrente conta só com paid === true", () => {
    expect(countsInTotals({ recurring: true, paid: true })).toBe(true);
    expect(countsInTotals({ recurring: true, paid: false })).toBe(false);
    expect(countsInTotals({ recurring: true, paid: null })).toBe(false);
    expect(countsInTotals({ recurring: true })).toBe(false);
  });
});

describe("orderByPaid (PAGO-03 AC 1-2)", () => {
  it("põe as não pagas depois de avulsos e pagas, mantendo a ordem relativa de cada grupo", () => {
    const rows = [
      naoPago("n1", "2026-11-20"),
      avulso("a1", "2026-11-18"),
      naoPago("n2", "2026-11-15"),
      pago("p1", "2026-11-12"),
      avulso("a2", "2026-11-05"),
    ];
    expect(orderByPaid(rows).map((r) => r.id)).toEqual(["a1", "p1", "a2", "n1", "n2"]);
  });

  it("mês sem recorrentes mantém a ordem atual", () => {
    const rows = [avulso("a1", "2026-11-20"), avulso("a2", "2026-11-10"), avulso("a3", "2026-11-01")];
    expect(orderByPaid(rows).map((r) => r.id)).toEqual(["a1", "a2", "a3"]);
  });

  it("todas as recorrentes pagas mantém a ordem atual", () => {
    const rows = [pago("p1", "2026-11-20"), avulso("a1", "2026-11-10"), pago("p2", "2026-11-01")];
    expect(orderByPaid(rows).map((r) => r.id)).toEqual(["p1", "a1", "p2"]);
  });

  it("todas não pagas mantém a ordem atual e nenhuma conta", () => {
    const rows = [naoPago("n1", "2026-11-20"), naoPago("n2", "2026-11-10")];
    expect(orderByPaid(rows).map((r) => r.id)).toEqual(["n1", "n2"]);
    expect(rows.filter(countsInTotals)).toEqual([]);
  });

  it("recorrente com paid ausente vai para o fim", () => {
    const rows: Row[] = [{ ...pago("x"), paid: undefined }, avulso("a1")];
    expect(orderByPaid(rows).map((r) => r.id)).toEqual(["a1", "x"]);
  });

  it("não altera o array recebido", () => {
    const rows = [naoPago("n1"), avulso("a1")];
    orderByPaid(rows);
    expect(rows.map((r) => r.id)).toEqual(["n1", "a1"]);
  });
});

describe("applyPaid (PAGO-04 AC 4-5)", () => {
  it("override marca e desmarca recorrentes pelo id", () => {
    const rows = [naoPago("n1"), pago("p1")];
    const out = applyPaid(rows, new Map([["n1", true], ["p1", false]]));
    expect(out.map((r) => [r.id, r.paid])).toEqual([
      ["n1", true],
      ["p1", false],
    ]);
  });

  it("avulso ignora override e continua com paid null", () => {
    const out = applyPaid([avulso("a1")], new Map([["a1", false]]));
    expect(out[0].paid).toBeNull();
    expect(countsInTotals(out[0])).toBe(true);
  });

  it("linha sem override fica como veio", () => {
    const rows = [naoPago("n1"), pago("p1")];
    const out = applyPaid(rows, new Map([["n1", true]]));
    expect(out[1]).toEqual(rows[1]);
  });

  it("não altera as linhas recebidas", () => {
    const rows = [naoPago("n1")];
    applyPaid(rows, new Map([["n1", true]]));
    expect(rows[0].paid).toBe(false);
  });
});

describe("paidLabel (PAGO-02 AC 5)", () => {
  it("gasto: Pago / Não pago", () => {
    expect(paidLabel("expense", true)).toBe("Pago");
    expect(paidLabel("expense", false)).toBe("Não pago");
  });

  it("ganho: Recebido / Não recebido", () => {
    expect(paidLabel("income", true)).toBe("Recebido");
    expect(paidLabel("income", false)).toBe("Não recebido");
  });

  it("paid ausente ou null é não pago", () => {
    expect(paidLabel("expense", null)).toBe("Não pago");
    expect(paidLabel("income", undefined)).toBe("Não recebido");
  });
});

describe("countedNetByDay (PAGO-04 AC 6)", () => {
  it("saldo do dia só sobre linhas que contam", () => {
    const totals = countedNetByDay([
      avulso("a1", "2026-11-10", 3_000),
      pago("p1", "2026-11-10", 2_000, "income"),
      naoPago("n1", "2026-11-10", 50_000),
      naoPago("n2", "2026-11-09", 7_000),
    ]);
    expect(totals.get("2026-11-10")).toBe(-1_000);
    expect(totals.has("2026-11-09")).toBe(false);
  });
});

describe("startsDay (PAGO-04 AC 6)", () => {
  it("é verdadeiro na primeira linha", () => {
    expect(startsDay(undefined, avulso("a1"))).toBe(true);
  });

  it("é verdadeiro quando a data muda e falso no mesmo dia e grupo", () => {
    expect(startsDay(avulso("a1", "2026-11-10"), pago("p1", "2026-11-09"))).toBe(true);
    expect(startsDay(avulso("a1", "2026-11-10"), pago("p1", "2026-11-10"))).toBe(false);
    expect(startsDay(naoPago("n1", "2026-11-10"), naoPago("n2", "2026-11-10"))).toBe(false);
  });

  it("um dia com linhas nos dois grupos gera dois cabeçalhos", () => {
    const shown = orderByPaid([avulso("a1", "2026-11-10"), naoPago("n1", "2026-11-10"), pago("p1", "2026-11-10")]);
    const headings = shown.filter((row, i) => startsDay(shown[i - 1], row)).map((r) => r.id);
    expect(headings).toEqual(["a1", "n1"]);
  });
});

describe("paidActionLabel (PAGO-11)", () => {
  it("não pago: gasto \"Marcar como pago\", ganho \"Marcar como recebido\"", () => {
    expect(paidActionLabel("expense", false)).toBe("Marcar como pago");
    expect(paidActionLabel("income", false)).toBe("Marcar como recebido");
  });

  it("pago: gasto \"Pago\", ganho \"Recebido\"", () => {
    expect(paidActionLabel("expense", true)).toBe("Pago");
    expect(paidActionLabel("income", true)).toBe("Recebido");
  });

  it("paid ausente ou null é não pago", () => {
    expect(paidActionLabel("expense", null)).toBe("Marcar como pago");
    expect(paidActionLabel("income", undefined)).toBe("Marcar como recebido");
  });
});
