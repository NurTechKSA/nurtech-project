function getUnitMinutes(unit: string): number {
  switch (unit) {
    case 'w':
      return 2400;
    case 'd':
      return 480;
    case 'h':
      return 60;
    case 'm':
      return 1;
    default:
      return 0;
  }
}

export function parseDuration(input: string): number | null {
  if (!input.trim()) {
    return null;
  }

  const parts = input.trim().split(/\s+/);
  let totalMinutes = 0;
  let lastUnitOrder = -1;

  for (const part of parts) {
    const match = /^(\d+)([wdhm])$/.exec(part);

    if (!match) {
      return null;
    }

    const value = Number(match[1]);
    const unit = match[2];
    const unitOrder = 'wdhm'.indexOf(unit);

    if (unitOrder <= lastUnitOrder) {
      return null;
    }

    lastUnitOrder = unitOrder;
    totalMinutes += value * getUnitMinutes(unit);

    if (!Number.isSafeInteger(totalMinutes)) {
      return null;
    }
  }

  return totalMinutes;
}
