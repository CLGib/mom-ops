const US_CENTRAL = "America/Chicago";

/**
 * Format a date for display in US Central time (e.g. task/ticket dates).
 */
export function formatInCentral(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    timeZone: US_CENTRAL,
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Format a date as relative time (e.g. "2 min ago", "1 hr ago") for last-activity display.
 */
export function formatRelative(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? "s" : ""} ago`;
  return formatInCentral(date);
}
