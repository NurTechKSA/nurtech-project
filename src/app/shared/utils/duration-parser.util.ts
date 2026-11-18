const MINUTES_PER_UNIT: Record<string, number> = {
  w: 2400,
  d: 480,
  h: 60,
  m: 1,
};

/**
 * Переводит строку вида "1w 2d 3h 30m" в минуты.
 * При некорректном формате возвращает null.
 */
export function parseDuration(input: string): number | null {
  const parts: string[] = input.trim().split(' ').filter(Boolean);

  if (!parts.length) return null;

  let totalMinutes = 0;

  for (const part of parts) {
    const amountText: string = part.slice(0, -1);
    const amount = Number(amountText);

    if (!amountText || !Number.isInteger(amount) || amount < 0) return null;

    const unitSymbol: string = part.slice(-1);
    const minutesPerUnit: number = MINUTES_PER_UNIT[unitSymbol];

    if (!minutesPerUnit) return null;

    totalMinutes += amount * minutesPerUnit;
  }

  return Number.isSafeInteger(totalMinutes) ? totalMinutes : null;
}
