/**
 * Returns the daily reporting window: 08:30 today → 08:30 tomorrow
 * If current time < 08:30, uses yesterday 08:30 → today 08:30
 */
export function getDailyWindow(date?: Date) {
  const now = date ?? new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  const start = new Date(now);
  const end = new Date(now);

  if (h > 8 || (h === 8 && m >= 30)) {
    start.setHours(8, 30, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(8, 30, 0, 0);
  } else {
    start.setDate(start.getDate() - 1);
    start.setHours(8, 30, 0, 0);
    end.setHours(8, 30, 0, 0);
  }

  return { start, end, startISO: start.toISOString(), endISO: end.toISOString() };
}

export function formatWindowLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const s = start.toLocaleDateString("fr-FR", opts);
  const e = end.toLocaleDateString("fr-FR", opts);
  return `${s} 08:30 → ${e} 08:30`;
}
