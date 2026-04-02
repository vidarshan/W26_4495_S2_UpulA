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

type LocationLike = {
  city?: string | null;
  postalCode?: string | null;
};

function toLocationLike(value: unknown): LocationLike | null {
  if (!value || typeof value !== "object") return null;

  const maybeLocation = value as {
    city?: unknown;
    postalCode?: unknown;
  };

  return {
    city: typeof maybeLocation.city === "string" ? maybeLocation.city : null,
    postalCode:
      typeof maybeLocation.postalCode === "string"
        ? maybeLocation.postalCode
        : null,
  };
}

type StaffLike = {
  staffProfile?: {
    staffAddress?: LocationLike | null;
  } | null;
  lastKnownJobLocation?: unknown;
};

export function getBestProximityScore(
  staff: StaffLike,
  jobLocation: LocationLike,
) {
  const homeScore = getProximityScore({
    staffCity: staff.staffProfile?.staffAddress?.city,
    staffPostal: staff.staffProfile?.staffAddress?.postalCode,
    jobCity: jobLocation.city,
    jobPostal: jobLocation.postalCode,
  });

  const lastKnownJobLocation = toLocationLike(staff.lastKnownJobLocation);

  const lastJobScore = lastKnownJobLocation
    ? getProximityScore({
        staffCity: lastKnownJobLocation.city,
        staffPostal: lastKnownJobLocation.postalCode,
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
