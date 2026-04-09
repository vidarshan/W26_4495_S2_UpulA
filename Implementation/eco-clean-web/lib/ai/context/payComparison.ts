type PayComparisonPeriod = {
  grossEarnings: number;
  netEarnings: number;
  totalHours: number;
  overtimeHours: number;
  totalDeductions: number;
  hourlyRate: number;
};

export function buildPayComparisonContext(
  a: PayComparisonPeriod,
  b: PayComparisonPeriod,
) {
  return {
    periodA: {
      gross: a.grossEarnings,
      net: a.netEarnings,
      hours: a.totalHours,
      overtime: a.overtimeHours,
      deductions: a.totalDeductions,
      rate: a.hourlyRate,
    },
    periodB: {
      gross: b.grossEarnings,
      net: b.netEarnings,
      hours: b.totalHours,
      overtime: b.overtimeHours,
      deductions: b.totalDeductions,
      rate: b.hourlyRate,
    },
    differences: {
      grossDiff: b.grossEarnings - a.grossEarnings,
      netDiff: b.netEarnings - a.netEarnings,
      hoursDiff: b.totalHours - a.totalHours,
      overtimeDiff: b.overtimeHours - a.overtimeHours,
      deductionDiff: b.totalDeductions - a.totalDeductions,
    },
  };
}
