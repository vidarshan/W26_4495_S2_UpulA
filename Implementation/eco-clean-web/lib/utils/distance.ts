export function getPostalPrefix(postal?: string | null) {
  if (!postal) return null;
  return postal.replace(/\s+/g, "").slice(0, 3).toUpperCase();
}

export function normalizeCity(city?: string | null) {
  return city?.trim().toLowerCase() || null;
}

export function getProximityScore(params: {
  staffCity?: string | null;
  staffPostal?: string | null;
  jobCity?: string | null;
  jobPostal?: string | null;
}) {
  const staffPrefix = getPostalPrefix(params.staffPostal);
  const jobPrefix = getPostalPrefix(params.jobPostal);

  const staffCity = normalizeCity(params.staffCity);
  const jobCity = normalizeCity(params.jobCity);

  let score = 0;

  if (staffPrefix && jobPrefix && staffPrefix === jobPrefix) {
    score += 100;
  } else if (staffCity && jobCity && staffCity === jobCity) {
    score += 60;
  } else {
    score += 20;
  }

  return score;
}

export function getBestProximityScore(staff: any, jobLocation: any) {
  const homeScore = getProximityScore({
    staffCity: staff.staffProfile?.staffAddress?.city,
    staffPostal: staff.staffProfile?.staffAddress?.postalCode,
    jobCity: jobLocation.city,
    jobPostal: jobLocation.postalCode,
  });

  const lastJobScore = staff.lastKnownJobLocation
    ? getProximityScore({
        staffCity: staff.lastKnownJobLocation.city,
        staffPostal: staff.lastKnownJobLocation.postalCode,
        jobCity: jobLocation.city,
        jobPostal: jobLocation.postalCode,
      })
    : null;

  if (lastJobScore !== null && lastJobScore > homeScore) {
    return {
      score: lastJobScore,
      origin: "last_job" as const,
    };
  }

  return {
    score: homeScore,
    origin: "home" as const,
  };
}
