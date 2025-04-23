/**
 * Parses a date string and returns a UTC Date object
 * This ensures consistent date handling across different timezones
 */
export function parseDateAsUTC(dateString: string): Date {
  const date = new Date(dateString);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
}