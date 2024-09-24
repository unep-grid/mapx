/**
 * Convert a duration in milliseconds to a human-readable string.
 *
 * @param {number} durationMs - The duration in milliseconds.
 * @returns {string} A human-readable representation of the duration.
 */
export function convertDuration(durationMs) {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;

  const days = Math.floor(durationMs / msPerDay);
  const hours = Math.floor((durationMs % msPerDay) / msPerHour);
  const minutes = Math.floor((durationMs % msPerHour) / msPerMinute);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? "s" : ""}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? "s" : ""}`);

  return parts.length === 0 ? "less than a minute" : parts.join(", ");
}
