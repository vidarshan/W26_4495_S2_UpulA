export function mapToPayComparison(res: any) {
  return {
    summary: res.brief,
    keyDrivers: res.priorityOrder,
    increases: res.checklist,
    decreases: res.alerts,
    anomalies:
      res.riskLevel === "high" && res.riskReason
        ? [res.riskReason]
        : [],
    recommendation: res.completionDraft,
  };
}