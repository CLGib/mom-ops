export function getMemberCreditCost(baseCredits: number): number {
  if (!Number.isFinite(baseCredits) || baseCredits <= 0) return 0;
  return Math.floor(baseCredits * 0.8);
}
