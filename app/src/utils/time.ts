export function formatClock(minutesFromDayStart: number, dayStartMinutes: number): string {
  const total = dayStartMinutes + minutesFromDayStart;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseClockToMinutesFromDayStart(clock: string, dayStartMinutes: number): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + (m || 0) - dayStartMinutes;
}
