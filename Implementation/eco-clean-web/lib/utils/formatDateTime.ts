export function formatDateTime(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
