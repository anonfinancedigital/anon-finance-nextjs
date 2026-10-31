/** Net of each day: receitas minus gastos, in cents, keyed by "AAAA-MM-DD". */
export function netByDay(rows: { date: string; kind: "income" | "expense"; amountCents: number }[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const signed = row.kind === "income" ? row.amountCents : -row.amountCents;
    totals.set(row.date, (totals.get(row.date) ?? 0) + signed);
  }
  return totals;
}
