import {
  CandidateRecommendation,
  CandidateStaff,
  Staff,
} from "@/types";

function isCandidateStaff(member: Staff | CandidateStaff): member is CandidateStaff {
  return "leaves" in member || "assignments" in member;
}

export function getStaffAvailabilityStatus(
  member: Staff | CandidateStaff,
  recommendedMembers: CandidateRecommendation[] = [],
) {
  const isRecommended = recommendedMembers.some(
    (candidate) => candidate.staff.id === member.id,
  );

  if (isRecommended) {
    return "Recommended";
  }

  if (isCandidateStaff(member)) {
    if ((member.leaves?.length ?? 0) > 0) {
      return "On leave";
    }

    if ((member.assignments?.length ?? 0) > 0) {
      return "Busy";
    }
  }

  return "Available";
}

export function formatStaffOptionLabel(
  member: Staff | CandidateStaff,
  recommendedMembers: CandidateRecommendation[] = [],
) {
  const status = getStaffAvailabilityStatus(member, recommendedMembers);
  return status === "Available" ? member.name : `${member.name} (${status})`;
}

export function summarizeStaffAvailability(
  staffMembers: Array<Staff | CandidateStaff>,
  recommendedMembers: CandidateRecommendation[] = [],
) {
  if (!staffMembers.length) {
    return "No staff available";
  }

  const counts = staffMembers.reduce(
    (acc, member) => {
      const status = getStaffAvailabilityStatus(member, recommendedMembers);

      if (status === "Recommended") acc.recommended += 1;
      else if (status === "On leave") acc.onLeave += 1;
      else if (status === "Busy") acc.busy += 1;
      else acc.available += 1;

      return acc;
    },
    { recommended: 0, available: 0, busy: 0, onLeave: 0 },
  );

  const parts = [];

  if (counts.recommended > 0) {
    parts.push(`${counts.recommended} recommended`);
  }

  if (counts.available > 0) {
    parts.push(`${counts.available} available`);
  }

  if (counts.busy > 0) {
    parts.push(`${counts.busy} busy`);
  }

  if (counts.onLeave > 0) {
    parts.push(`${counts.onLeave} on leave`);
  }

  return parts.join(" • ");
}
