import { Appointment, CalendarSelection } from "@/types";
import { create } from "zustand";

type CancelMode = "JOB" | "APPOINTMENT" | null;

interface CalendarState {
  triggerRefresh: () => void;
  setTriggerRefresh: (fn: () => void) => void;
}

interface DashboardUIState {
  // selection
  selectedJobId: string | null;
  selectedApptId: string | null;
  selectedInfo: CalendarSelection | null;

  // modals
  newJobOpen: boolean;
  appointmentOpen: boolean;
  confirmCancelOpen: boolean;

  cancelMode: CancelMode;

  // actions
  openNewJobWithSelection: (arg: CalendarSelection) => void;
  closeNewJob: () => void;

  openAppointment: (jobId: string, apptId: string) => void;
  closeAppointment: () => void;

  openConfirmCancel: (mode: CancelMode) => void;
  closeConfirmCancel: () => void;

  resetSelection: () => void;
}

export const useDashboardUI = create<DashboardUIState>((set) => ({
  selectedJobId: null,
  selectedApptId: null,
  selectedInfo: null,

  newJobOpen: false,
  appointmentOpen: false,
  confirmCancelOpen: false,

  cancelMode: null,

  openNewJobWithSelection: (selection) =>
    set({
      newJobOpen: true,
      selectedInfo: selection,
    }),

  closeNewJob: () =>
    set({
      newJobOpen: false,
    }),

  openAppointment: (jobId, apptId) =>
    set({
      selectedJobId: jobId,
      selectedApptId: apptId,
      appointmentOpen: true,
    }),

  closeAppointment: () =>
    set({
      appointmentOpen: false,
    }),

  openConfirmCancel: (mode) =>
    set({
      cancelMode: mode,
      confirmCancelOpen: true,
      appointmentOpen: false,
    }),

  closeConfirmCancel: () =>
    set({
      confirmCancelOpen: false,
      cancelMode: null,
    }),

  resetSelection: () =>
    set({
      selectedJobId: null,
      selectedApptId: null,
      cancelMode: null,
    }),
}));

export const useCalendarStore = create<CalendarState>((set) => ({
  triggerRefresh: () => {},
  setTriggerRefresh: (fn) => set(() => ({ triggerRefresh: fn })),
}));

interface AppointmentState {
  selectedAppointment?: Appointment;
  setSelectedAppointment: (appt: Appointment) => void;
  clearSelectedAppointment: () => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  selectedAppointment: undefined,
  setSelectedAppointment: (appt) => set({ selectedAppointment: appt }),
  clearSelectedAppointment: () => set({ selectedAppointment: undefined }),
}));
