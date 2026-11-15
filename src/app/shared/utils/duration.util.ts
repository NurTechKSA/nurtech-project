export function parseDuration(input: string): number | null {
  if (!input.trim()) {
    return null;
  }

  const parts = input.trim().split(/\s+/);

  let totalMinutes = 0;
  let hasHours = false;
  let hasMinutes = false;

  for (const part of parts) {
    if (!/^\d+[hm]$/.test(part)) {
      return null;
    }

    const value = Number(part.slice(0, -1));
    const unit = part.at(-1);

    if (unit === 'h') {
      if (hasHours || hasMinutes) {
        return null;
      }

      hasHours = true;
      totalMinutes += value * 60;
    } else if (unit === 'm') {
      if (hasMinutes) {
        return null;
      }

      hasMinutes = true;
      totalMinutes += value;
    }

    if (!Number.isSafeInteger(totalMinutes)) {
      return null;
    }
  }

  return totalMinutes;
}
