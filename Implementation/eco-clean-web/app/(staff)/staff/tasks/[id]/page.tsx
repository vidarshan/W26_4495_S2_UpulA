"use client";

import AiTaskAssistantCard from "@/app/components/cards/AiTaskAssistantCard";
import { useAppointmentDetails } from "@/hooks/useAppointmentDetails";
import {
  completeAppointment,
  pauseAppointment,
  saveVisitNote,
  startAppointment,
  updateAppointmentChecklistItem,
} from "@/lib/api/appointments";
import { showLocalNotification } from "@/lib/notifications/showNotification";
import { useUploadThing } from "@/lib/uploadthing";
import formatPrettyDate from "@/lib/utils/formatPrettyDate";
import { TaskAssistantResponse } from "@/lib/ai/schemas";
import { AI_FEATURES_ENABLED } from "@/lib/config/ai";
import { APP_TZ } from "@/lib/dateTime";
import { AppointmentWithRelations, JobNote, WorkSession } from "@/types";
import { queryKeys } from "@/lib/queryKeys";
import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Flex,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DateTime } from "luxon";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { IoDocumentText, IoLocation, IoPerson, IoTime } from "@/lib/icons";
import { useStaffUiStore } from "@/stores/store";
import ImageViewer from "@/app/components/media/ImageViewer";
import Loader from "@/app/components/UI/Loader";
import { useLastUpdated } from "@/hooks/useLastUpdated";

const CARD_RADIUS = "md";
const HERO_PADDING = "lg";
const CARD_PADDING = "lg";

function formatAddress(address?: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  if (!address) return "";

  return [
    address.street1,
    address.street2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export type NoteImage = {
  id: string;
  url: string;
  fileKey?: string | null;
};

export type Note = {
  id: string;
  title?: string | null;
  content: string;
  category?: string | null;
  isPinned?: boolean;
  isClientVisible?: boolean;
  createdAt: string | Date;
  images?: NoteImage[];
};

function buildDirectionsUrl(address?: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const fullAddress = formatAddress(address);
  if (!fullAddress) return "";

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
}

function openDirections(address?: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const url = buildDirectionsUrl(address);
  if (!url) return;

  window.location.assign(url);
}

function getElapsedSeconds(
  sessions: { startedAt: string; endedAt: string | null }[],
  nowMs: number,
) {
  return sessions.reduce((sum, s) => {
    const startMs = new Date(s.startedAt).getTime();
    const endMs = s.endedAt ? new Date(s.endedAt).getTime() : nowMs;
    return sum + Math.max(0, Math.floor((endMs - startMs) / 1000));
  }, 0);
}

function formatSeconds(total: number) {
  const hrs = String(Math.floor(total / 3600)).padStart(2, "0");
  const mins = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

const Page = () => {
  const aiFeaturesEnabled = AI_FEATURES_ENABLED;
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const appointmentId = params?.id;

  const { data: session, status: sessionStatus } = useSession();
  const myStaffId = session?.user?.id;
  const [now, setNow] = useState(() => Date.now());

  const [visitNote, setVisitNote] = useState("");
  const [, setVisitImages] = useState<File[]>([]);
  const [uploadedVisitImages, setUploadedVisitImages] = useState<
    { url: string; fileKey: string }[]
  >([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const setTitle = useStaffUiStore((s) => s.setTitle);
  const setBack = useStaffUiStore((s) => s.setBack);
  const setOnBack = useStaffUiStore((s) => s.setOnBack);
  const setOnRefresh = useStaffUiStore((s) => s.setOnRefresh);
  const setRefreshing = useStaffUiStore((s) => s.setRefreshing);
  const resetTopBar = useStaffUiStore((s) => s.resetTopBar);

  const qc = useQueryClient();
  const { startUpload, isUploading } = useUploadThing("appointmentImages");
  const appointmentQueryKey = queryKeys.appointments.detail(appointmentId);

  const {
    data: appointment,
    isLoading,
    error,
  } = useAppointmentDetails(appointmentId);

  const lastUpdated = useLastUpdated(
    queryKeys.appointments.detail(appointmentId),
  );

  function formatLastUpdated(value: string | number | Date) {
    const date = new Date(value);

    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const { data: aiTaskAssistant, isLoading: isAssistantLoading } =
    useQuery<TaskAssistantResponse>({
      queryKey: ["ai-task-assistant", appointmentId],
      queryFn: async () => {
        const res = await fetch(
          `/api/ai/appointments/${appointmentId}/task-assistant`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "plan",
              includePreviousVisit: true,
            }),
          },
        );

        if (!res.ok) {
          throw new Error("Failed to load AI task assistant");
        }

        return res.json();
      },
      enabled: aiFeaturesEnabled && !!appointmentId,
    });

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const refreshAppointment = (updated: unknown) => {
    qc.setQueryData(appointmentQueryKey, updated);
    qc.invalidateQueries({
      queryKey: appointmentQueryKey,
    });
    qc.invalidateQueries({ queryKey: ["staff-tasks"] });
  };

  const mutateAppointmentCache = (
    updater: (current: AppointmentWithRelations) => AppointmentWithRelations,
  ) => {
    qc.setQueryData<AppointmentWithRelations | undefined>(
      appointmentQueryKey,
      (current) => {
        if (!current) return current;
        return updater(current);
      },
    );
  };

  const saveVisitNoteMutation = useMutation({
    mutationFn: async () => {
      if (!appointment?.id) {
        throw new Error("Missing appointment");
      }

      return saveVisitNote(appointment.id, {
        content: visitNote,
        images: uploadedVisitImages.map((img) => ({
          url: img.url,
          fileKey: img.fileKey,
        })),
      });
    },
    onSuccess: (updated) => {
      refreshAppointment(updated);
      setVisitNote("");
      setVisitImages([]);
      setUploadedVisitImages([]);
      showLocalNotification("Visit note saved", "/staff/tasks");
    },
    onError: (error: unknown) => {
      showLocalNotification(
        getErrorMessage(error) || "Failed to save note",
        "/staff/tasks",
      );
    },
  });

  const startMutation = useMutation({
    mutationFn: () => {
      if (!appointment?.id || !myStaffId) {
        throw new Error("Missing appointment or staff id");
      }
      return startAppointment(appointment.id, myStaffId);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: appointmentQueryKey });

      const previous =
        qc.getQueryData<AppointmentWithRelations>(appointmentQueryKey);
      const optimisticStartedAt = new Date().toISOString();

      if (myStaffId) {
        mutateAppointmentCache((current) => ({
          ...current,
          workSessions: [
            ...(current.workSessions ?? []),
            {
              id: `optimistic-start-${myStaffId}`,
              appointmentId: current.id,
              staffId: myStaffId,
              startedAt: optimisticStartedAt,
              endedAt: null,
            },
          ],
        }));
      }

      return { previous };
    },
    onSuccess: (updated) => {
      refreshAppointment(updated);
      showLocalNotification("Job started", `/staff/tasks/${appointment!.id}`);
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(appointmentQueryKey, context.previous);
      }
      showLocalNotification(
        getErrorMessage(error) || "Failed to start job",
        "/staff/tasks",
      );
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => {
      if (!appointment?.id || !myStaffId) {
        throw new Error("Missing appointment or staff id");
      }
      return pauseAppointment(appointment.id, myStaffId);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: appointmentQueryKey });

      const previous =
        qc.getQueryData<AppointmentWithRelations>(appointmentQueryKey);
      const optimisticEndedAt = new Date().toISOString();

      if (myStaffId) {
        mutateAppointmentCache((current) => {
          const sessions = [...(current.workSessions ?? [])];
          const activeIndex = [...sessions]
            .reverse()
            .findIndex(
              (session) => session.staffId === myStaffId && !session.endedAt,
            );

          if (activeIndex === -1) {
            return current;
          }

          const actualIndex = sessions.length - 1 - activeIndex;
          sessions[actualIndex] = {
            ...sessions[actualIndex],
            endedAt: optimisticEndedAt,
          };

          return {
            ...current,
            workSessions: sessions,
          };
        });
      }

      return { previous };
    },
    onSuccess: (updated) => {
      refreshAppointment(updated);
      showLocalNotification("Job paused", `/staff/tasks/${appointment!.id}`);
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(appointmentQueryKey, context.previous);
      }
      showLocalNotification(
        getErrorMessage(error) || "Job pause failed",
        `/staff/tasks/${appointment!.id}`,
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      if (!appointment?.id || !myStaffId) {
        throw new Error("Missing appointment or staff id");
      }
      return completeAppointment(appointment.id, myStaffId);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: appointmentQueryKey });

      const previous =
        qc.getQueryData<AppointmentWithRelations>(appointmentQueryKey);
      const optimisticEndedAt = new Date().toISOString();

      mutateAppointmentCache((current) => ({
        ...current,
        status: "COMPLETED",
        workSessions: (current.workSessions ?? []).map((session) =>
          session.endedAt
            ? session
            : {
                ...session,
                endedAt: optimisticEndedAt,
              },
        ),
      }));

      return { previous };
    },
    onSuccess: (updated) => {
      refreshAppointment(updated);
      showLocalNotification(
        "Job marked as completed",
        `/staff/tasks/${appointment!.id}`,
      );
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(appointmentQueryKey, context.previous);
      }
      showLocalNotification(
        getErrorMessage(error) || "Job completion failed",
        `/staff/tasks/${appointment!.id}`,
      );
    },
  });

  const checklistMutation = useMutation({
    mutationFn: ({
      itemId,
      completed,
    }: {
      itemId: string;
      completed: boolean;
    }) => {
      if (!appointment?.id) {
        throw new Error("Missing appointment");
      }

      return updateAppointmentChecklistItem(appointment.id, {
        itemId,
        completed,
      });
    },
    onMutate: async ({ itemId, completed }) => {
      await qc.cancelQueries({ queryKey: appointmentQueryKey });

      const previous =
        qc.getQueryData<AppointmentWithRelations>(appointmentQueryKey);

      mutateAppointmentCache((current) => ({
        ...current,
        checklistItems: (current.checklistItems ?? []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                isCompleted: completed,
                completedAt: completed ? new Date().toISOString() : null,
                completedById: completed ? (myStaffId ?? null) : null,
              }
            : item,
        ),
      }));

      return { previous };
    },
    onSuccess: (updated) => {
      refreshAppointment(updated);
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(appointmentQueryKey, context.previous);
      }
      showLocalNotification(
        getErrorMessage(error) || "Failed to update checklist",
        `/staff/tasks/${appointment?.id}`,
      );
    },
  });

  useEffect(() => {
    setTitle("Task Details");
    setBack(true);
    setOnBack(() => {
      router.back();
    });
    setOnRefresh(null);
    setRefreshing(false);

    return () => {
      resetTopBar();
    };
  }, [
    router,
    setTitle,
    setBack,
    setOnBack,
    setOnRefresh,
    setRefreshing,
    resetTopBar,
  ]);

  if (isLoading) {
    return (
      <Container h="100vh" py="md">
        <Flex direction="column" h="100%" justify="center" align="center">
          <Loader />
          <Text fw={700} mt="sm">
            Fetching...
          </Text>
        </Flex>
      </Container>
    );
  }

  if (error || !appointment) {
    return (
      <Container py="md">
        <Button variant="subtle" onClick={() => router.back()}>
          Back
        </Button>
        <Text c="red" mt="md">
          Failed to load appointment details.
        </Text>
      </Container>
    );
  }

  const start = DateTime.fromISO(appointment.startTime).setZone(APP_TZ);
  const end = DateTime.fromISO(appointment.endTime).setZone(APP_TZ);
  const job = appointment.job;
  const client = job?.client ?? null;
  const address = job?.address ?? undefined;

  const clientName = [client?.title, client?.firstName, client?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const phone = client?.phone ?? null;
  const notes: Note[] = (job?.notes ?? []).map((note: JobNote) => ({
    id: note.id,
    title: note.title,
    content: note.content ?? "",
    category: note.category,
    isPinned: note.isPinned,
    isClientVisible: note.isClientVisible,
    createdAt: note.createdAt,
    images: note.images,
  }));
  const fullAddress = formatAddress(address);
  const visitNotes = (appointment.notes ?? []).filter(
    (note) => !note.isClientVisible,
  );
  const visitNoteCount = visitNotes.length;
  const visitNoteLimit = 10;
  const visitNoteLimitReached = visitNoteCount >= visitNoteLimit;

  const allSessions = appointment.workSessions ?? [];

  const mySessions = allSessions.filter(
    (s: WorkSession & { staffId?: string }) => s.staffId === myStaffId,
  );

  const isAnyoneRunning = allSessions.some((s: WorkSession) => !s.endedAt);
  const isRunning = mySessions.some((s: WorkSession) => !s.endedAt);
  const elapsedSeconds = getElapsedSeconds(mySessions, nowMs);

  const scheduledSeconds = Math.max(
    0,
    Math.floor(
      (new Date(appointment.endTime).getTime() -
        new Date(appointment.startTime).getTime()) /
        1000,
    ),
  );

  const overtimeSeconds = Math.max(0, elapsedSeconds - scheduledSeconds);
  const remainingSeconds = Math.max(0, scheduledSeconds - elapsedSeconds);

  const progressPct =
    scheduledSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / scheduledSeconds) * 100))
      : 0;

  const isOvertime = elapsedSeconds > scheduledSeconds;

  const activeStaffIds = new Set(
    allSessions.filter((s: WorkSession) => !s.endedAt).map((s) => s.staffId),
  );

  const assignedStaff = appointment.assignments ?? [];
  const leadAssignment = assignedStaff.find(
    (assignment) => assignment.isTeamLead,
  );
  const isOnlyParticipant =
    !!myStaffId &&
    assignedStaff.length === 1 &&
    assignedStaff[0]?.staff.id === myStaffId;
  const isTeamLead = !!myStaffId && leadAssignment?.staff.id === myStaffId;
  const canToggleChecklist = isOnlyParticipant || isTeamLead;
  const checklistItems = appointment.checklistItems ?? [];

  const canAct =
    sessionStatus !== "loading" &&
    !!myStaffId &&
    appointment.status !== "COMPLETED" &&
    appointment.status !== "CANCELLED";

  const getMemberState = (staffId: string) => {
    const memberSessions = allSessions.filter(
      (s: WorkSession) => s.staffId === staffId,
    );
    const isActive = memberSessions.some((s: WorkSession) => !s.endedAt);

    if (isActive) return "Active";
    if (memberSessions.length > 0) return "Paused";
    return "Not started";
  };

  return (
    <Container p={0} mih="100vh" className="staff-app-page">
      <Stack gap="sm" p="md">
        <Card
          radius="lg"
          withBorder
          p={HERO_PADDING}
          className="staff-app-surface staff-app-surface--hero"
        >
          <Group justify="space-between" align="start" mb="sm">
            <Box>
              <Text fw={800} size="xl" mt={4}>
                {job?.title ?? "Appointment"}
              </Text>
              <Text size="sm" c="dimmed">
                {start.toFormat("cccc, LLL d")}
              </Text>
            </Box>
          </Group>
          <Badge
            size="sm"
            radius="lg"
            color={appointment?.status === "COMPLETED" ? "lime" : "blue"}
            variant="light"
          >
            {appointment.status === "COMPLETED"
              ? "Completed"
              : appointment.status === "CANCELLED"
                ? "Cancelled"
                : isRunning
                  ? "You are on the job"
                  : isAnyoneRunning
                    ? "Someone else has already started"
                    : "Not started"}
          </Badge>
          <Stack gap={4} align="center" my="md">
            <Box ta="center">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Remaining
              </Text>
              <Text c={isOvertime ? "red" : "dark"} fw={800} fz={44} lh={1}>
                {formatSeconds(remainingSeconds)}
              </Text>
            </Box>

            <Text size="sm" c="dimmed">
              {formatSeconds(elapsedSeconds)} used out of{" "}
              {formatSeconds(scheduledSeconds)}
            </Text>
          </Stack>

          <Progress
            value={progressPct}
            animated={isRunning}
            color={isOvertime ? "red" : "lime"}
            radius="lg"
          />

          <Text mt={6} fw={600} size="xs" c={isOvertime ? "red" : "dimmed"}>
            {appointment.status === "COMPLETED"
              ? "Appointment completed"
              : appointment.status === "CANCELLED"
                ? "Appointment cancelled"
                : isOvertime
                  ? `Overtime by ${formatSeconds(overtimeSeconds)}`
                  : `${progressPct}% of your planned time used`}
          </Text>

          <Card p={0} my="xs" shadow="0" withBorder>
            <Flex direction="column" gap="xs" p="sm">
              {/* Start */}
              <Group gap="xs" align="center">
                <ThemeIcon variant="light" radius="lg" color="lime">
                  <IoTime size={16} />
                </ThemeIcon>

                <Box>
                  <Text size="xs" c="dimmed">
                    Start
                  </Text>
                  <Text fw={600} size="sm">
                    {start.toFormat("h:mm a")}
                  </Text>
                </Box>
              </Group>

              {/* End */}
              <Group gap="xs" align="center">
                <ThemeIcon variant="light" radius="lg" color="gray">
                  <IoTime size={16} />
                </ThemeIcon>

                <Box>
                  <Text size="xs" c="dimmed">
                    End
                  </Text>
                  <Text fw={600} size="sm">
                    {end.toFormat("h:mm a")}
                  </Text>
                </Box>
              </Group>
            </Flex>
          </Card>

          <Text mt={6} fw={600} size="xs" c="dimmed">
            {lastUpdated
              ? `Last updated • ${formatLastUpdated(lastUpdated)}`
              : null}
          </Text>
        </Card>

        <SimpleGrid cols={2} spacing="sm">
          <Button
            radius="lg"
            color="lime"
            fullWidth
            disabled={!canAct || isRunning}
            loading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            Start Job
          </Button>

          <Button
            radius="xl"
            color="lime"
            fullWidth
            disabled={!canAct || !isRunning}
            loading={pauseMutation.isPending}
            onClick={() => pauseMutation.mutate()}
          >
            Pause Job
          </Button>
        </SimpleGrid>

        <Button
          radius="lg"
          color="blue"
          fullWidth
          disabled={!canAct}
          loading={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          Complete Job
        </Button>

        {aiFeaturesEnabled && isAssistantLoading ? (
          <Card radius={CARD_RADIUS} withBorder p={CARD_PADDING}>
            <Group gap="sm">
              <Loader />
              <Text size="sm" c="dimmed">
                Loading AI task assistant...
              </Text>
            </Group>
          </Card>
        ) : aiFeaturesEnabled && aiTaskAssistant ? (
          <AiTaskAssistantCard data={aiTaskAssistant} />
        ) : null}

        <Card radius="lg" withBorder p="md" className="staff-app-surface">
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="lg" variant="light" color="teal">
              <IoPerson size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Team Activity
            </Text>
          </Group>

          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {activeStaffIds.size} of {assignedStaff.length} working right now
            </Text>

            {assignedStaff.map((assignment, index) => {
              const member = assignment.staff;
              const isMe = member.id === myStaffId;
              const memberState = getMemberState(member.id);
              return (
                <Box key={assignment.id}>
                  <Group
                    key={member.id}
                    justify="space-between"
                    className="staff-task-detail__row"
                  >
                    <Box>
                      <Text size="sm" lh={0} fw={isMe ? 700 : 500}>
                        {member.name} {isMe ? "(You)" : ""}
                      </Text>
                      {assignment.isTeamLead && (
                        <Badge mt="sm" size="xs">
                          Team Lead
                        </Badge>
                      )}
                    </Box>
                    <Badge
                      size="sm"
                      radius="lg"
                      color={
                        memberState === "Active"
                          ? "green"
                          : memberState === "Paused"
                            ? "yellow"
                            : "gray"
                      }
                      variant="filled"
                    >
                      {memberState}
                    </Badge>
                  </Group>
                  {index === assignedStaff.length - 1 ? null : (
                    <Divider mt="xs" mb="xs" />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Card>

        {checklistItems.length ? (
          <Card
            radius="lg"
            withBorder
            p={CARD_PADDING}
            className="staff-app-surface"
          >
            <Group mb="sm" gap="xs">
              <ThemeIcon radius="lg" variant="light" color="lime">
                <IoDocumentText size={16} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text fw={700} size="sm">
                  Appointment Checklist
                </Text>
                <Text size="xs" c="dimmed">
                  {canToggleChecklist
                    ? "You can update this checklist."
                    : "Only the team lead or sole participant can update this checklist."}
                </Text>
              </Box>
            </Group>

            <Stack gap="xs">
              {checklistItems.map((item, index) => (
                <Box key={item.id}>
                  <Checkbox
                    checked={item.isCompleted}
                    disabled={
                      !canToggleChecklist || checklistMutation.isPending
                    }
                    label={
                      <Text
                        size="sm"
                        td={item.isCompleted ? "line-through" : "none"}
                      >
                        {item.label}
                      </Text>
                    }
                    onChange={(event) =>
                      checklistMutation.mutate({
                        itemId: item.id,
                        completed: event.currentTarget.checked,
                      })
                    }
                  />
                  {index === checklistItems.length - 1 ? null : (
                    <Divider mt="xs" mb="xs" />
                  )}
                </Box>
              ))}
            </Stack>
          </Card>
        ) : null}

        <Card
          radius="lg"
          withBorder
          p={CARD_PADDING}
          className="staff-app-surface"
        >
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="lg" variant="light" color="teal">
              <IoLocation size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Directions
            </Text>
          </Group>

          <Flex justify="space-between" align="center" gap="md">
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {address?.street1 ?? "Address unavailable"}
              </Text>

              {address?.street2 ? (
                <Text size="sm">{address.street2}</Text>
              ) : null}

              <Text size="sm">
                {address?.city ?? ""}
                {address?.city && address?.province ? ", " : ""}
                {address?.province ?? ""}
              </Text>

              <Text size="sm">{address?.postalCode ?? ""}</Text>
            </Box>

            <Button
              radius="lg"
              color="lime"
              disabled={!address}
              onClick={() => openDirections(address)}
            >
              Directions
            </Button>
          </Flex>

          <Text size="xs" c="dimmed" mt="sm">
            {fullAddress}
          </Text>
        </Card>

        <Card
          radius="lg"
          withBorder
          p={CARD_PADDING}
          className="staff-app-surface"
        >
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="lg" variant="light" color="blue">
              <IoPerson size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Client Details
            </Text>
          </Group>

          <Stack gap={4}>
            <Text fw={600}>{clientName}</Text>

            {client?.companyName ? (
              <Text size="sm" c="dimmed">
                {client.companyName}
              </Text>
            ) : null}

            {client?.email ? (
              <Text size="sm" c="dimmed">
                {client.email}
              </Text>
            ) : null}
          </Stack>

          <Group mt="md" grow>
            <Button
              component="a"
              radius="lg"
              color="lime"
              href={phone ? `tel:${phone}` : undefined}
              disabled={!phone}
            >
              Call
            </Button>

            <Button
              component="a"
              radius="lg"
              color="blue"
              href={phone ? `sms:${phone}` : undefined}
              disabled={!phone}
            >
              Message
            </Button>
          </Group>
        </Card>

        <Card
          radius="lg"
          withBorder
          p={CARD_PADDING}
          className="staff-app-surface"
        >
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="lg" variant="light" color="grape">
              <IoDocumentText size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Instructions
            </Text>
          </Group>

          <Stack gap="xs">
            {notes?.length ? (
              notes.map((note, index) => (
                <Box key={note.id}>
                  <Group justify="space-between" align="flex-start" mb={6}>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600} size="sm">
                        {note.title?.trim() || "Untitled note"}
                      </Text>
                    </Box>

                    <Text size="xs" c="dimmed">
                      {formatPrettyDate(note.createdAt)}
                    </Text>
                  </Group>

                  <Text size="sm" c="dark.7" lh={1.45}>
                    {note.content}
                  </Text>

                  <Group mt="xs" gap={6}>
                    {note.category ? (
                      <Badge
                        variant="light"
                        radius="lg"
                        size="sm"
                        color={note.isPinned ? "yellow" : "gray"}
                      >
                        {note.category.replaceAll("_", " ")}
                        {note.isPinned ? " • Pinned" : ""}
                      </Badge>
                    ) : null}

                    {note.isClientVisible ? (
                      <Badge variant="light" radius="lg" size="sm" color="blue">
                        Client visible
                      </Badge>
                    ) : null}
                  </Group>

                  {note.images?.length ? (
                    <Group mt="sm" gap="xs">
                      {note.images.map((img) => (
                        <ImageViewer
                          key={img.id}
                          src={img.url}
                          alt="Job note image"
                          modalTitle="Job Note Image"
                          thumbWidth={76}
                          thumbHeight={76}
                          thumbRadius="lg"
                        />
                      ))}
                    </Group>
                  ) : null}
                  {index === notes.length - 1 ? null : (
                    <Divider mt="md" mb="md" />
                  )}
                </Box>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                There are no extra notes for this job.
              </Text>
            )}
          </Stack>
        </Card>

        <Card
          radius="lg"
          withBorder
          p={CARD_PADDING}
          className="staff-app-surface"
        >
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="lg" variant="light" color="orange">
              <IoDocumentText size={16} />
            </ThemeIcon>
            <Box style={{ flex: 1 }}>
              <Text fw={700} size="sm">
                Previous notes
              </Text>
              <Text size="xs" c="dimmed">
                {visitNoteCount} of {visitNoteLimit} visit notes used
              </Text>
            </Box>
          </Group>

          <Stack gap="xs">
            {visitNotes.length ? (
              visitNotes.map((note, index) => (
                <Box key={note.id}>
                  <Group justify="space-between" mb={6}>
                    <Text size="xs" c="dimmed">
                      {formatPrettyDate(note.createdAt)}
                    </Text>
                  </Group>

                  <Text size="sm" lh={1.45}>
                    {note.content}
                  </Text>

                  {note.images?.length ? (
                    <Group mt="sm" gap="xs">
                      {note.images.map((img) => (
                        <ImageViewer
                          key={img.id}
                          src={img.url}
                          alt="Visit note image"
                          modalTitle="Visit Note Image"
                          thumbWidth={76}
                          thumbHeight={76}
                          thumbRadius="lg"
                        />
                      ))}
                    </Group>
                  ) : null}
                  {index === visitNotes.length - 1 ? null : (
                    <Divider mt="md" mb="md" />
                  )}
                </Box>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                Nothing has been added here yet.
              </Text>
            )}
          </Stack>
        </Card>
        {!visitNoteLimitReached && (
          <Card
            radius="lg"
            withBorder
            p={CARD_PADDING}
            className="staff-app-surface"
          >
            <Group mb="sm" gap="xs">
              <ThemeIcon radius="lg" variant="light" color="orange">
                <IoDocumentText size={16} />
              </ThemeIcon>
              <Box style={{ flex: 1 }}>
                <Text fw={700} size="sm">
                  Add a note
                </Text>
                <Text size="xs" c="dimmed">
                  {visitNoteLimitReached
                    ? `This appointment already has the maximum ${visitNoteLimit} visit notes.`
                    : `${visitNoteLimit - visitNoteCount} visit notes remaining.`}
                </Text>
              </Box>
            </Group>

            <Stack gap="sm">
              <Textarea
                id="visit-note-textarea"
                label="What should the team know?"
                placeholder="Add anything helpful from this visit."
                minRows={4}
                value={visitNote}
                onChange={(e) => setVisitNote(e.currentTarget.value)}
                radius="lg"
                disabled={visitNoteLimitReached}
              />

              {uploadedVisitImages.length ? (
                <Group gap="xs">
                  {uploadedVisitImages.map((img) => (
                    <ImageViewer
                      key={img.fileKey}
                      src={img.url}
                      alt="Visit image"
                      modalTitle="Visit Image"
                      thumbWidth={76}
                      thumbHeight={76}
                      thumbRadius="lg"
                    />
                  ))}
                </Group>
              ) : null}

              <Dropzone
                accept={["image/png", "image/jpeg", "image/webp"]}
                maxFiles={10}
                className="staff-task-detail__dropzone"
                disabled={visitNoteLimitReached || isUploading}
                onDrop={async (files) => {
                  const uploaded = await startUpload(files);

                  const imgs = (uploaded ?? []).map((u) => ({
                    url: u.url,
                    fileKey: u.key,
                  }));

                  setVisitImages((prev) => [...prev, ...files].slice(0, 10));
                  setUploadedVisitImages((prev) =>
                    [...prev, ...imgs].slice(0, 10),
                  );
                }}
              >
                <Flex direction="column" align="center" py="xs">
                  <IoDocumentText size={24} />
                  <Text mt="xs" size="xs">
                    Drag visit images here or click to upload (4MB Max, up to 10
                    images)
                  </Text>
                  {isUploading ? (
                    <Text mt="xs" size="xs" c="dimmed">
                      Uploading...
                    </Text>
                  ) : null}
                </Flex>
              </Dropzone>

              <Button
                radius="xl"
                color="orange"
                loading={saveVisitNoteMutation.isPending}
                disabled={
                  visitNoteLimitReached ||
                  isUploading ||
                  (!visitNote.trim() && !uploadedVisitImages.length)
                }
                onClick={() => saveVisitNoteMutation.mutate()}
              >
                Save Visit Note
              </Button>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

export default Page;
