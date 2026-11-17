export function parseDuration(input: string): number | null {
  if (!input.trim()) return null;

  let total = 0;

  for (const part of input.trim().split(' ').filter(Boolean)) {
    const unit = part.slice(-1);
    const number = part.slice(0, -1);
    const value = Number(number);

    if (!['w', 'd', 'h', 'm'].includes(unit)) return null;
    if (!number || !Number.isInteger(value) || value < 0) return null;

    if (unit === 'w') total += value * 2400;
    else if (unit === 'd') total += value * 480;
    else if (unit === 'h') total += value * 60;
    else if (unit === 'm') total += value;
  }

  return Number.isSafeInteger(total) ? total : null;
}
