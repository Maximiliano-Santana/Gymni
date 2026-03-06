/**
 * Timezone utilities — zero dependencies, uses Intl.DateTimeFormat.
 * All functions take an IANA timezone string (e.g. "America/Mexico_City").
 */

const DEFAULT_TZ = "America/Mexico_City";

/** "Today" in the gym's timezone as "YYYY-MM-DD" */
export function todayInTimezone(timezone: string = DEFAULT_TZ): string {
  return dateToTimezoneStr(new Date(), timezone);
}

/** Convert a Date/ISO to its date in the given timezone as "YYYY-MM-DD" */
export function dateToTimezoneStr(
  date: Date | string,
  timezone: string = DEFAULT_TZ,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  return `${year}-${month}-${day}`;
}

/**
 * Convert a local date string ("YYYY-MM-DD") at midnight in the given
 * timezone to a UTC Date object. Useful for DB queries.
 */
export function localMidnightToUTC(
  dateStr: string,
  timezone: string = DEFAULT_TZ,
): Date {
  // Strategy: start with noon UTC on that date (avoids DST edge cases),
  // then use Intl to find the local time at that moment, compute the offset,
  // and adjust to get midnight local in UTC.
  const [year, month, day] = dateStr.split("-").map(Number);
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(noonUTC);

  const localH = Number(parts.find((p) => p.type === "hour")!.value);
  const localM = Number(parts.find((p) => p.type === "minute")!.value);
  const localDay = Number(parts.find((p) => p.type === "day")!.value);
  const localMonth = Number(parts.find((p) => p.type === "month")!.value);

  // Offset in minutes: how far local time is from noon UTC
  // If local is 6:00 (CDT), offset = (6*60+0) - 720 = -360 min = UTC-6
  let offsetMinutes = (localH * 60 + localM) - 720;

  // Handle day boundary crossings (e.g. UTC+13)
  if (localDay !== day || localMonth !== month) {
    if (localDay > day || localMonth > month) {
      offsetMinutes += 1440; // local is next day
    } else {
      offsetMinutes -= 1440; // local is previous day
    }
  }

  // midnight local = 00:00 local = -(offset) in UTC
  // midnight_utc = dateStr:00:00:00Z - offsetMinutes
  return new Date(Date.UTC(year, month - 1, day, 0, -offsetMinutes, 0));
}

/**
 * Get start and end of "today" in the given timezone, as UTC Dates.
 * Used for check-in "already checked in today" queries.
 */
export function getDayBoundsUTC(
  timezone: string = DEFAULT_TZ,
): { start: Date; end: Date } {
  const todayStr = todayInTimezone(timezone);
  const start = localMidnightToUTC(todayStr, timezone);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * Format a date for display in the tenant's timezone.
 * Returns e.g. "6 mar 2026"
 */
export function formatTenantDate(
  date: Date | string,
  timezone: string = DEFAULT_TZ,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  });
}

/**
 * Format a time for display in the tenant's timezone.
 * Returns e.g. "11:30 p.m."
 */
export function formatTenantTime(
  date: Date | string,
  timezone: string = DEFAULT_TZ,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  });
}
