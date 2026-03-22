/**
 * Returns the daily reporting window: 00:00 → 23:59:59 of the current day
 */
export function getDailyWindow(date?: Date) {
  const now = date ?? new Date();

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { start, end, startISO: start.toISOString(), endISO: end.toISOString() };
}

export function formatWindowLabel(start: Date, _end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return start.toLocaleDateString("fr-FR", opts);
}
