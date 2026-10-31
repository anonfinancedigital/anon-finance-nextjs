const heading = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "AAAA-MM-DD" as a day heading, e.g. "2026-10-28" → "Quarta-feira, 28 de outubro". */
export function formatDayHeading(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const text = heading.format(new Date(Date.UTC(year, month - 1, day)));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
