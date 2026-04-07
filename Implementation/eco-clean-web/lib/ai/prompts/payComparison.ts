export function buildPayComparisonPrompt(ctx: any) {
  return `
You are an assistant that explains payroll differences between two pay periods.

Context:
${JSON.stringify(ctx, null, 2)}

Return JSON using EXACT keys:

- brief → Overall explanation of pay change
- priorityOrder → Main drivers of change (biggest reasons first)
- checklist → Positive changes (increase in earnings)
- alerts → Negative changes (reductions, higher deductions)
- timePlan → Leave empty array []
- riskLevel → low | medium | high depending on unusual changes
- riskReason → Explain if anything unusual
- completionDraft → Recommendation for the employee

Rules:
- Do NOT calculate anything
- Use only given data
- Be simple and clear
`;
}