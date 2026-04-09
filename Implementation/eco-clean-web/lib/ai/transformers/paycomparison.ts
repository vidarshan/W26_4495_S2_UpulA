type PayComparisonResult = {
  brief?: string;
  priorityOrder?: string[];
  checklist?: string[];
  alerts?: string[];
  riskLevel?: "low" | "medium" | "high";
  riskReason?: string | null;
  completionDraft?: string | null;
};

export function mapToPayComparison(res: PayComparisonResult) {
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
