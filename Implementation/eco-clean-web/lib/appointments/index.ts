import { run5DayReminders } from "./reminders";

export async function runReminders() {
  await run5DayReminders();
  // later: run1DayReminders()
}
