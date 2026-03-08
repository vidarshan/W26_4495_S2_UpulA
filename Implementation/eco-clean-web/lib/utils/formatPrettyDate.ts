import { DateTime } from "luxon";
import { APP_TZ } from "@/lib/dateTime";
function formatPrettyDate(input: Date | string | null | undefined) {
  if (!input) return "";

  const dt =
    typeof input === "string"
      ? DateTime.fromISO(input, { zone: "utc" }).setZone(APP_TZ)
      : DateTime.fromJSDate(input, { zone: APP_TZ });

  return dt.isValid ? dt.toFormat("MMM d, yyyy") : "";
}

export default formatPrettyDate;
