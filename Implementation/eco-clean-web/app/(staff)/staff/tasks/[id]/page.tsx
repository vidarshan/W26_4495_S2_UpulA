"use client";

import AiTaskAssistantCard from "@/app/components/cards/AiTaskAssistantCard";
import { useAppointmentDetails } from "@/hooks/useAppointmentDetails";
import {
  completeAppointment,
  pauseAppointment,
  saveVisitNote,
  startAppointment,
} from "@/lib/api/appointments";
import { showLocalNotification } from "@/lib/notifications/showNotification";
import { useUploadThing } from "@/lib/uploadthing";
import formatPrettyDate from "@/lib/utils/formatPrettyDate";
import { TaskAssistantResponse } from "@/lib/ai/schemas";
import { APP_TZ } from "@/lib/dateTime";
import { WorkSession } from "@/types";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Drawer,
  Flex,
  Group,
  Image,
  Loader,
  Paper,
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
import React, { useEffect, useState } from "react";
import {
  IoArrowBackOutline,
  IoCallOutline,
  IoChatbubbleEllipsesOutline,
  IoDocumentTextOutline,
  IoLocationOutline,
  IoMapOutline,
  IoPauseOutline,
  IoPersonOutline,
  IoPlayOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { useStaffUiStore } from "@/stores/store";

const HERO_RADIUS = "lg";
const CARD_RADIUS = "md";
const HERO_PADDING = "lg";
const CARD_PADDING = "md";

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

type AppointmentImage = {
  id: string;
  url: string;
  fileKey?: string | null;
};

export type NoteImage = {
  id: string;
  url: string;
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
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
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

const Page = () => {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const appointmentId = params?.id;

  const [imgOpened, setImgOpened] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [visitNote, setVisitNote] = useState("");
  const [visitImages, setVisitImages] = useState<File[]>([]);
  const [uploadedVisitImages, setUploadedVisitImages] = useState<
    { url: string; fileKey: string }[]
  >([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const setTitle = useStaffUiStore((s) => s.setTitle);
  const setBack = useStaffUiStore((s) => s.setBack);
  const setOnBack = useStaffUiStore((s) => s.setOnBack);
  const setOnRefresh = useStaffUiStore((s) => s.setOnRefresh);
  const setRefreshing = useStaffUiStore((s) => s.setRefreshing);
  const resetTopBar = useStaffUiStore((s) => s.resetTopBar);
  const qc = useQueryClient();
  const { startUpload, isUploading } = useUploadThing("appointmentImages");

  const {
    data: appointment,
    isLoading,
    error,
  } = useAppointmentDetails(appointmentId);

  const {
    data: aiTaskAssistant,
    isLoading: isAssistantLoading,
    isFetching: isAssistantFetching,
  } = useQuery<TaskAssistantResponse>({
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
    enabled: !!appointmentId,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const refreshAppointment = (updated: unknown) => {
    qc.setQueryData(["appointment-details", appointmentId], updated);
    qc.invalidateQueries({ queryKey: ["appointment-details", appointmentId] });
    qc.invalidateQueries({ queryKey: ["staff-tasks"] });
  };

  const saveVisitNoteMutation = useMutation({
    mutationFn: async () =>
      await saveVisitNote(appointment!.id, {
        content: visitNote,
        images: uploadedVisitImages.map((img) => ({
          url: img.url,
          fileKey: img.fileKey,
        })),
      }),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      setVisitNote("");
      setVisitImages([]);
      setUploadedVisitImages([]);
      showLocalNotification("Visit note saved", "/staff/tasks");
    },
    onError: () => {
      showLocalNotification("Failed to save note", "/staff/tasks");
    },
  });

  const startMutation = useMutation({
    mutationFn: () =>
      startAppointment(appointment!.id, appointment?.staff?.[0]?.id),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      showLocalNotification("Job started", `/staff/tasks/${appointment!.id}`);
    },
    onError: () => {
      showLocalNotification("Failed to start job", "/staff/tasks");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => pauseAppointment(appointment!.id),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      showLocalNotification("Job paused", `/staff/tasks/${appointment!.id}`);
    },
    onError: () => {
      showLocalNotification(
        "Job pause failed",
        `/staff/tasks/${appointment!.id}`,
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeAppointment(appointment!.id),
    onSuccess: (updated) => {
      refreshAppointment(updated);
      showLocalNotification(
        "Job marked as completed",
        `/staff/tasks/${appointment!.id}`,
      );
    },
    onError: () => {
      showLocalNotification(
        "Job completion failed",
        `/staff/tasks/${appointment!.id}`,
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
        <Button
          variant="subtle"
          leftSection={<IoArrowBackOutline />}
          onClick={() => router.back()}
        >
          Back
        </Button>
        <Text c="red" mt="md">
          Failed to load appointment details.
        </Text>
      </Container>
    );
  }

  const openImagePreview = (imgUrl: string) => {
    setSelectedImage(imgUrl);
    setImgOpened(true);
  };

  const start = DateTime.fromISO(appointment.startTime).setZone(APP_TZ);
  const end = DateTime.fromISO(appointment.endTime).setZone(APP_TZ);

  const clientName = [
    appointment.job.client.title,
    appointment.job.client.firstName,
    appointment.job.client.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const phone = appointment.job.client.phone;
  const notes = appointment.job.notes;
  const fullAddress = formatAddress(appointment.job.address);

  const sessions = appointment.workSessions ?? [];
  const isRunning = sessions.some((s: WorkSession) => !s.endedAt);
  const elapsedSeconds = getElapsedSeconds(sessions, nowMs);

  const scheduledSeconds = Math.max(
    0,
    Math.floor(
      (new Date(appointment.endTime).getTime() -
        new Date(appointment.startTime).getTime()) /
        1000,
    ),
  );

  const overtimeSeconds = Math.max(0, elapsedSeconds - scheduledSeconds);

  const progressPct =
    scheduledSeconds > 0
      ? Math.min(100, Math.round((elapsedSeconds / scheduledSeconds) * 100))
      : 0;

  const isOvertime = elapsedSeconds > scheduledSeconds;

  return (
    <Container p={0} bg="#f5f6f7" mih="100vh">
      <Drawer
        opened={imgOpened}
        overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        onClose={() => {
          setImgOpened(false);
          setSelectedImage(null);
        }}
        position="bottom"
        size="90%"
        radius={CARD_RADIUS}
        title="Image Preview"
        padding="md"
      >
        {selectedImage ? (
          <Flex justify="center" align="center" h="100%">
            <Image
              src={selectedImage}
              alt="Preview"
              fit="contain"
              radius={CARD_RADIUS}
              mah="75vh"
              w="100%"
            />
          </Flex>
        ) : null}
      </Drawer>

      <Stack gap="sm" p="md">
        <Card radius={HERO_RADIUS} withBorder shadow="xs" p={HERO_PADDING}>
          <Group justify="space-between" align="start" mb="sm">
            <Box>
              <Text fw={700} size="lg">
                {appointment.job.title}
              </Text>
              <Text size="sm" c="dimmed">
                {start.toFormat("cccc, LLL d")}
              </Text>
            </Box>

            <Badge
              size="lg"
              radius="md"
              color={appointment.job.type === "ONE_OFF" ? "green" : "blue"}
              variant="filled"
            >
              {appointment.job.type === "ONE_OFF" ? "ONE OFF" : "RECURRING"}
            </Badge>
          </Group>

          <Text size="sm" c={isRunning ? "green" : "dimmed"} fw={600}>
            {appointment.status === "COMPLETED"
              ? "Completed"
              : isRunning
                ? "Currently running"
                : "Paused / not started"}
          </Text>

          <Stack gap={0} align="center" my="md">
            <Text fw={800} fz={44} lh={1}>
              {formatSeconds(elapsedSeconds)}
            </Text>
            <Text fw={700} fz={34} lh={1.1}>
              {formatSeconds(scheduledSeconds)}
            </Text>
          </Stack>

          <Progress value={progressPct} radius="xl" />
          <Text mt={6} fw={600} size="xs" c={isOvertime ? "red" : "dimmed"}>
            {isOvertime
              ? `Overtime by ${formatSeconds(overtimeSeconds)}`
              : `${progressPct}% of scheduled duration used`}
          </Text>

          <Flex
            justify="space-between"
            align="center"
            mt="md"
            p="sm"
            style={{
              borderRadius: 10,
              background: "#f8f9fa",
            }}
          >
            <Group gap="xs" align="flex-start">
              <ThemeIcon variant="light" radius="md" color="green">
                <IoTimeOutline size={16} />
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

            <Group gap="xs" align="flex-start">
              <ThemeIcon variant="light" radius="md" color="green">
                <IoTimeOutline size={16} />
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

        <SimpleGrid cols={2} spacing="sm">
          <Button
            leftSection={<IoPlayOutline />}
            radius="md"
            size="md"
            color="green"
            fullWidth
            disabled={isRunning || appointment.status === "COMPLETED"}
            loading={startMutation.isPending}
            onClick={() => startMutation.mutate()}
          >
            Start Job
          </Button>

          <Button
            leftSection={<IoPauseOutline />}
            radius="md"
            size="md"
            color="lime"
            fullWidth
            disabled={!isRunning || appointment.status === "COMPLETED"}
            loading={pauseMutation.isPending}
            onClick={() => pauseMutation.mutate()}
          >
            Pause Job
          </Button>
        </SimpleGrid>

        <Button
          radius="md"
          color="blue"
          fullWidth
          disabled={appointment.status === "COMPLETED"}
          loading={completeMutation.isPending}
          onClick={() => completeMutation.mutate()}
        >
          Complete Job
        </Button>

        {isAssistantLoading ? (
          <Card radius={CARD_RADIUS} withBorder shadow="xs" p={CARD_PADDING}>
            <Group gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Loading AI task assistant...
              </Text>
            </Group>
          </Card>
        ) : aiTaskAssistant ? (
          <AiTaskAssistantCard data={aiTaskAssistant} />
        ) : null}

        <Card radius={CARD_RADIUS} withBorder shadow="xs" p={CARD_PADDING}>
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="md" variant="light" color="teal">
              <IoLocationOutline size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Directions
            </Text>
          </Group>

          <Flex justify="space-between" align="center" gap="md">
            <Box style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                {appointment.job.address.street1}
              </Text>

              {appointment.job.address.street2 ? (
                <Text size="sm">{appointment.job.address.street2}</Text>
              ) : null}

              <Text size="sm">
                {appointment.job.address.city},{" "}
                {appointment.job.address.province}
              </Text>

              <Text size="sm">{appointment.job.address.postalCode}</Text>
            </Box>

            <Button
              leftSection={<IoMapOutline />}
              radius="md"
              color="green"
              onClick={() => {
                const url = buildDirectionsUrl(appointment.job.address);
                window.open(url, "_blank");
              }}
            >
              Directions
            </Button>
          </Flex>

          <Text size="xs" c="dimmed" mt="sm">
            {fullAddress}
          </Text>
        </Card>

        <Card radius={CARD_RADIUS} withBorder shadow="xs" p={CARD_PADDING}>
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="md" variant="light" color="blue">
              <IoPersonOutline size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Client Details
            </Text>
          </Group>

          <Stack gap={4}>
            <Text fw={600}>{clientName}</Text>

            {appointment.job.client.companyName ? (
              <Text size="sm" c="dimmed">
                {appointment.job.client.companyName}
              </Text>
            ) : null}

            {appointment.job.client.email ? (
              <Text size="sm" c="dimmed">
                {appointment.job.client.email}
              </Text>
            ) : null}
          </Stack>

          <Group mt="md" grow>
            <Button
              component="a"
              radius="md"
              color="green"
              leftSection={<IoCallOutline />}
              href={phone ? `tel:${phone}` : undefined}
              disabled={!phone}
            >
              Call
            </Button>

            <Button
              component="a"
              radius="md"
              color="blue"
              leftSection={<IoChatbubbleEllipsesOutline />}
              href={phone ? `sms:${phone}` : undefined}
              disabled={!phone}
            >
              Message
            </Button>
          </Group>
        </Card>

        <Card radius={CARD_RADIUS} withBorder shadow="xs" p={CARD_PADDING}>
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="md" variant="light" color="grape">
              <IoDocumentTextOutline size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Instructions
            </Text>
          </Group>

          <Stack gap="xs">
            {notes?.length ? (
              notes.map((note: Note) => (
                <Paper key={note.id} radius="md" p="sm" withBorder>
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
                        radius="md"
                        size="sm"
                        color={note.isPinned ? "yellow" : "gray"}
                      >
                        {note.category.replaceAll("_", " ")}
                        {note.isPinned ? " • Pinned" : ""}
                      </Badge>
                    ) : null}

                    {note.isClientVisible ? (
                      <Badge variant="light" radius="md" size="sm" color="blue">
                        Client visible
                      </Badge>
                    ) : null}
                  </Group>

                  {note.images?.length ? (
                    <Group mt="sm" gap="xs">
                      {note.images.map((img) => (
                        <Image
                          onClick={() => openImagePreview(img.url)}
                          key={img.id}
                          src={img.url}
                          alt="note image"
                          w={76}
                          h={76}
                          radius="md"
                          fit="cover"
                        />
                      ))}
                    </Group>
                  ) : null}
                </Paper>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                No notes provided.
              </Text>
            )}
          </Stack>
        </Card>

        <Card radius={CARD_RADIUS} withBorder shadow="xs" p={CARD_PADDING}>
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="md" variant="light" color="orange">
              <IoDocumentTextOutline size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Visit History
            </Text>
          </Group>

          <Stack gap="xs">
            {appointment.notes?.length ? (
              appointment.notes.map((note: Note) => (
                <Paper key={note.id} radius="md" p="sm" withBorder>
                  <Group justify="space-between" mb={6}>
                    <Text fw={600} size="sm">
                      Visit note
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatPrettyDate(note.createdAt)}
                    </Text>
                  </Group>

                  <Text size="sm" lh={1.45}>
                    {note.content}
                  </Text>

                  {appointment.images?.length ? (
                    <Group mt="sm" gap="xs">
                      {appointment.images.map((img: AppointmentImage) => (
                        <Image
                          onClick={() => openImagePreview(img.url)}
                          key={img.id}
                          src={img.url}
                          alt="note image"
                          w={76}
                          h={76}
                          radius="md"
                          fit="cover"
                        />
                      ))}
                    </Group>
                  ) : null}
                </Paper>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                No visit notes yet.
              </Text>
            )}
          </Stack>
        </Card>

        <Card radius={CARD_RADIUS} withBorder shadow="xs" p={CARD_PADDING}>
          <Group mb="sm" gap="xs">
            <ThemeIcon radius="md" variant="light" color="orange">
              <IoDocumentTextOutline size={16} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              Add Visit Note
            </Text>
          </Group>

          <Stack gap="sm">
            <Textarea
              label="What happened during this visit?"
              placeholder="Add visit details, issues, observations, client requests..."
              minRows={4}
              value={visitNote}
              onChange={(e) => setVisitNote(e.currentTarget.value)}
            />

            {uploadedVisitImages.length ? (
              <Group gap="xs">
                {uploadedVisitImages.map((img) => (
                  <Image
                    key={img.fileKey}
                    src={img.url}
                    alt="visit image"
                    w={76}
                    h={76}
                    radius="md"
                    fit="cover"
                  />
                ))}
              </Group>
            ) : null}

            <Dropzone
              accept={["image/png", "image/jpeg", "image/webp"]}
              maxFiles={10}
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
                <IoDocumentTextOutline size={24} />
                <Text mt="xs" size="xs">
                  Drag visit images here or click to upload
                </Text>
                {isUploading ? (
                  <Text mt="xs" size="xs" c="dimmed">
                    Uploading...
                  </Text>
                ) : null}
              </Flex>
            </Dropzone>

            <Button
              radius="md"
              color="orange"
              loading={saveVisitNoteMutation.isPending}
              disabled={
                isUploading ||
                (!visitNote.trim() && !uploadedVisitImages.length)
              }
              onClick={() => saveVisitNoteMutation.mutate()}
            >
              Save Visit Note
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};

export default Page;
