export function combineDateAndTime(date: Date | null, time: string) {
  if (!date || !time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);

  return newDate;
}
