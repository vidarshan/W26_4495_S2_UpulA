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

  // modals
  newJobOpen: boolean;
  appointmentOpen: boolean;
  confirmCancelOpen: boolean;

  cancelMode: CancelMode;

  // actions
  openNewJob: () => void;
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

  newJobOpen: false,
  appointmentOpen: false,
  confirmCancelOpen: false,

  cancelMode: null,

  openNewJob: () => set({ newJobOpen: true }),
  closeNewJob: () => set({ newJobOpen: false }),

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
