"use client";

import {
  ActionIcon,
  Box,
  Button,
  Container,
  Drawer,
  MantineProvider,
  Text,
} from "@mantine/core";
import { signOut } from "next-auth/react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useDisclosure } from "@mantine/hooks";
import { IoMenuSharp } from "react-icons/io5";
export default function DashboardClient({ role }: { role: string }) {


  return (
    <>
     
    

      <h1>Dashboard</h1>
      <p>Role: {role}</p>
      <button onClick={() => signOut({ callbackUrl: "/login" })}>Logout</button>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        fixedWeekCount={false}
        showNonCurrentDates
        events={[
          { title: "Meeting", start: "2026-02-05T10:00:00" },
          { title: "Appointment", start: "2026-02-05T11:00:00" },
        ]}
      />
    </>
  );
}
