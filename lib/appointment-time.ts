const DEFAULT_TIMEZONE = "Asia/Karachi";

function parseDateTimeParts(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (
    !Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day) ||
    !Number.isInteger(hour) || !Number.isInteger(minute) ||
    month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59
  ) return null;

  return { year, month, day, hour, minute };
}

function partsInTimezone(instantMs: number, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(instantMs)).map(part => [part.type, part.value]));
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
  };
}

export function timezoneFromSettings(settings: Record<string, unknown> | null | undefined): string {
  const salon = settings?.salon as { timezone?: string } | undefined;
  const wasender = settings?.wasender as { quietHoursTimezone?: string } | undefined;
  return salon?.timezone || wasender?.quietHoursTimezone || DEFAULT_TIMEZONE;
}

export function appointmentStartMs(date: string, time: string, timezone = DEFAULT_TIMEZONE): number | null {
  const target = parseDateTimeParts(date, time);
  if (!target) return null;

  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  let guess = targetAsUtc;

  for (let i = 0; i < 3; i++) {
    const actual = partsInTimezone(guess, timezone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    const diff = actualAsUtc - targetAsUtc;
    if (diff === 0) break;
    guess -= diff;
  }

  return guess;
}

export function appointmentStartHasPassed(date: string, time: string, timezone = DEFAULT_TIMEZONE, nowMs = Date.now()): boolean {
  const startMs = appointmentStartMs(date, time, timezone);
  return startMs != null && startMs <= nowMs;
}
