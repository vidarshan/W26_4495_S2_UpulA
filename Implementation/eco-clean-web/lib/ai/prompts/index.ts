import { AssignmentInsightFields, CandidateResponse } from "@/types";

export function buildTaskAssistantPrompt(ctx: AssignmentInsightFields) {
  return `
Generate a structured AI task assistant response for this cleaning appointment.

Appointment context:
- Appointment date: ${ctx.appointmentDate}
- Start time: ${ctx.startTime}
- End time: ${ctx.endTime}
- Duration minutes: ${ctx.durationMinutes}
- Required staff count: ${ctx.requiredStaffCount}

Job context:
- Job title: ${ctx.jobTitle}
- Client name: ${ctx.clientName}
- Property address: ${
    ctx.propertyAddress
      ? `${ctx.propertyAddress.street1}, ${ctx.propertyAddress.city}, ${ctx.propertyAddress.province}`
      : "Unknown"
  }

Important rules:
- Do NOT restate all raw data.
- Focus on practical execution guidance for the cleaning team.
- You may infer availability conflicts from assignments and leaves.
- Do NOT invent facts.


Staff data:
${ctx.staff
  .map(
    (s) => `
- Name: ${s.name}
  Position: ${s.staffProfile?.position || "Unknown"}
  Hourly rate: ${s.staffProfile?.hourlyRate ?? "Unknown"}

  Last known location:
    ${
      s.lastKnownJobLocation
        ? `${s.lastKnownJobLocation.street1}, ${s.lastKnownJobLocation.city}`
        : "Unknown"
    }

  Home base:
    ${
      s.staffProfile?.staffAddress
        ? `${s.staffProfile.staffAddress.street1}, ${s.staffProfile.staffAddress.city}`
        : "Unknown"
    }

  Leaves:
    ${
      s.leaves.length > 0
        ? s.leaves
            .map((l) => `- ${l.type} (${l.startAt} → ${l.endAt})`)
            .join("\n    ")
        : "- None"
    }

  Assignments:
    ${
      s.assignments.length > 0
        ? s.assignments
            .map(
              (a) =>
                `- ${a.status} (${a.appointment.startTime} → ${a.appointment.endTime})`,
            )
            .join("\n    ")
        : "- None"
    }
`,
  )
  .join("\n")}

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
- "brief": 2–3 sentences summarizing the situation.
- "priorityOrder": 3-6 short ordered priorities for this appointment.
- "timePlan": 2-6 objects with "label" and integer "minutes" values that sum to a realistic plan for the visit duration.
- "alerts": 0-5 concise warnings, blockers, or watch-outs.
- "checklist": 3-8 concrete action items for the assigned cleaner or dispatcher.
- "riskLevel": low | medium | high.
- "riskReason": short explanation of risk, or null if risk is low and there is nothing notable.
- "completionDraft": a short draft completion note if useful, otherwise null.
- Base time allocations on the stated appointment duration.
- If all staff are unavailable, reflect that in "alerts", "riskLevel", and "checklist".
- Do not include extra keys.
- If proximityOrigin is "home", describe it as "close from home base" or "well-positioned geographically".
- If proximityOrigin is "last_job", describe it as "close from a recent nearby job" or "already positioned near the property".
- Do not quote enum values directly.
`;
}

export function buildStaffRecommendationPrompt(input: {
  appointmentStart: string;
  appointmentEnd: string;
  jobTitle?: string | null;
  candidateData: CandidateResponse["data"];
}) {
  const { candidateData } = input;

  return `
Generate a structured AI staff recommendation for dispatching a cleaning appointment.

Appointment context:
- Job title: ${input.jobTitle?.trim() || "Draft job"}
- Appointment start: ${input.appointmentStart}
- Appointment end: ${input.appointmentEnd}
- Property address: ${
    candidateData.jobLocation
      ? `${candidateData.jobLocation.street1 ?? ""}, ${candidateData.jobLocation.city ?? ""}, ${candidateData.jobLocation.province ?? ""}`
      : "Unknown"
  }

Rules:
- Choose the best staff member based on availability conflicts, proximity signal, and overall practicality.
- Prefer staff with no leave conflict and no overlapping assignment conflict.
- Use the provided "recommendedMembers" as a strong signal, but not as a blind requirement.
- If nobody is clearly assignable, set "topPick" to the best fallback and explain the compromise.
- Do not invent facts beyond the supplied candidate data.

Recommended members from the existing matcher:
${
  candidateData.recommendedMembers.length > 0
    ? candidateData.recommendedMembers
        .map(
          (member) =>
            `- ${member.staff.name} (${member.staff.id}): ${member.reason}`,
        )
        .join("\n")
    : "- None"
}

All staff candidates:
${candidateData.staffMembers
  .map((member) => {
    const leaveCount = member.leaves?.length ?? 0;
    const assignmentCount = member.assignments?.length ?? 0;

    return `- ${member.name} (${member.id})
  Leave conflicts: ${leaveCount}
  Assignment conflicts: ${assignmentCount}`;
  })
  .join("\n")}

Return JSON with exactly these keys:
brief,
topPick,
alternates,
unavailable,
cautions

Requirements:
- "brief": 2-3 sentences summarizing the recommendation.
- "topPick": best single choice with staffId, name, and reason, or null if none.
- "alternates": up to 3 fallback options, best to worst.
- "unavailable": staff who should not be assigned, with short reason.
- "cautions": short operational warnings for dispatch.
- Do not include extra keys.
`;
}
