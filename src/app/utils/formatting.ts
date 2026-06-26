/**
 * Formats an ISO date string into a readable representation.
 */
export function formatMatchDate(isoStr: string): string {
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return isoStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (_) {
    return isoStr;
  }
}

/**
 * Converts balance in cm to Points HL/HH string format.
 */
export function getPointsBalanceString(balanceCm: number, racquetLengthCm: number): string {
  const midpoint = racquetLengthCm / 2;
  const diff = midpoint - balanceCm;
  const points = Math.round(Math.abs(diff) / 0.3175); // 1 point = 1/8 inch = 0.3175 cm
  
  if (points === 0) return 'EB (Even Balance)';
  const direction = diff > 0 ? 'HL (Head Light)' : 'HH (Head Heavy)';
  return `${points} pts ${direction}`;
}
