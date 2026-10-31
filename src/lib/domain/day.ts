const saoPauloDay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

/** The day of `now` as AAAA-MM-DD in America/Sao_Paulo. */
export function todayInSaoPaulo(now: Date = new Date()): string {
  return saoPauloDay.format(now);
}

/** The day before an AAAA-MM-DD date, across month and year ends. */
export function previousDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}
