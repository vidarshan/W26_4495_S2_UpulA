"use client";

import { useEffect, useRef } from "react";
import { showLocalNotification } from "@/lib/localNotififcations";

type Appointment = {
  id: string;
  startTime: string;
  job: {
    title: string;
  };
};

export function AppointmentReminderWatcher({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];

    const now = Date.now();

    for (const appt of appointments) {
      const start = new Date(appt.startTime).getTime();
      const notifyAt = start - 15 * 60 * 1000; // 15 mins before
      const delay = notifyAt - now;

      if (delay > 0) {
        const timerId = window.setTimeout(() => {
          void showLocalNotification({
            title: "Appointment starting soon",
            body: `${appt.job.title} starts in 15 minutes.`,
            url: `/staff/tasks/${appt.id}`,
          });
        }, delay);

        timers.current.push(timerId);
      }
    }

    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [appointments]);

  return null;
}
