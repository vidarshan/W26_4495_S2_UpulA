type TaskAssistantContext = {
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "LATE";

  jobTitle: string;
  jobType: "ONE_OFF" | "RECURRING";
  visitInstructions: string | null;

  clientName: string;
  propertyAddress: string;

  lineItems: {
    name: string;
    quantity: number;
    description: string | null;
  }[];

  adminNotes: string[];
  clientNotes: string[];
  visitNotes: string[];

  previousVisitSummary: string | null;
  previousVisitIssues: string[];

  staffCount: number;
  staffNoteDraft: string | null;
  timeSpent: number | null;
};

export function buildTaskAssistantPrompt(
  ctx: TaskAssistantContext,
  mode: string,
) {
  return `
Generate a structured task assistant response for this cleaning appointment.

Mode: ${mode}

Appointment date: ${ctx.appointmentDate}
Start time: ${ctx.startTime}
End time: ${ctx.endTime}
Duration minutes: ${ctx.durationMinutes}
Status: ${ctx.status}

Job title: ${ctx.jobTitle}
Client name: ${ctx.clientName}
Property address: ${ctx.propertyAddress}
Staff count: ${ctx.staffCount}

Line items:
${ctx.lineItems.map((item) => `- ${item}`).join("\n") || "- None"}

Admin notes:
${ctx.adminNotes.map((note) => `- ${note}`).join("\n") || "- None"}

Client notes:
${ctx.clientNotes.map((note) => `- ${note}`).join("\n") || "- None"}

Previous visit summary:
${ctx.previousVisitSummary || "None"}

Previous visit issues:
${ctx.previousVisitIssues?.map((issue) => `- ${issue}`).join("\n") || "- None"}

Staff draft note:
${ctx.staffNoteDraft || "None"}

Return JSON with exactly these keys:
brief,
priorityOrder,
timePlan,
alerts,
checklist,
riskLevel,
riskReason,
completionDraft

Requirements:
- "brief" should be 2-3 sentences max.
- "priorityOrder" should be an ordered list of major work areas or tasks.
- "timePlan" should divide work into reasonable estimated minutes that roughly fit the total duration.
- "alerts" should include only important items staff should notice quickly.
- "checklist" should be actionable and easy to scan on mobile.
- "riskLevel" must be one of: low, medium, high.
- "riskReason" should explain schedule or complexity risk briefly.
- If mode is "plan", completionDraft must be null.
- If mode is "complete", completionDraft should be a professional completion summary using the staff draft note and appointment context.
- Do not include any extra keys.
`;
}
