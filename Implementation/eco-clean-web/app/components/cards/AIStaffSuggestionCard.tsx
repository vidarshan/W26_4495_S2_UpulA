import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Divider,
  Flex,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Loader,
} from "@mantine/core";
import { IoSparkles, IoTrophy } from "react-icons/io5";
import { Staff } from "@/types";
import { StaffRecommendationResponse } from "@/lib/ai/schemas";

type CandidateRecommendation = {
  staff: Staff;
  reason: string;
};

type CandidateStaff = Staff & {
  leaves?: Array<{
    id: string;
    type: string;
    startAt: string;
    endAt: string;
  }>;
  assignments?: Array<{
    id: string;
    status: string;
    appointment: {
      id: string;
      startTime: string;
      endTime: string;
    };
  }>;
};

type Props = {
  recommendedMembers?: CandidateRecommendation[];
  unavailableMembers?: CandidateStaff[];
  isLoading?: boolean;
  isDisabled?: boolean;
  aiSuggestion?: StaffRecommendationResponse | null;
  isAiLoading?: boolean;
  aiError?: boolean;
};

const AIStaffSuggestionCard = ({
  recommendedMembers = [],
  unavailableMembers = [],
  isLoading = false,
  isDisabled = false,
  aiSuggestion = null,
  isAiLoading = false,
  aiError = false,
}: Props) => {
  const hasContent =
    recommendedMembers.length > 0 ||
    unavailableMembers.length > 0 ||
    !!aiSuggestion;

  return (
    <Card
      radius="lg"
      p="md"
      withBorder
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 40%, #fdf2f8 100%)",
        border: "1px solid rgba(139, 92, 246, 0.15)",
        boxShadow:
          "0 12px 30px rgba(139, 92, 246, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      <Box />

      <Stack gap="md" style={{ position: "relative", zIndex: 1 }}>
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" align="center">
            <ActionIcon radius="xl" variant="light" color="pink" size="lg">
              <IoSparkles />
            </ActionIcon>

            <Box>
              <Text fw={700} size="md">
                AI Staff Recommendation
              </Text>
              <Text size="sm">
                Availability, conflicts, and AI ranking for the selected slot
              </Text>
            </Box>
          </Group>
        </Group>

        {isDisabled ? (
          <Text size="sm">
            Select a client address, date, start time, and end time to load
            available staff.
          </Text>
        ) : isLoading ? (
          <Group>
            <Loader size="sm" />
            <Text size="sm">Loading staff recommendations...</Text>
          </Group>
        ) : isAiLoading ? (
          <Group>
            <Loader size="sm" />
            <Text size="sm">Loading staff recommendations...</Text>
          </Group>
        ) : aiError ? (
          <Text size="sm" c="dimmed">
            AI staff recommendation could not be generated for this slot.
          </Text>
        ) : !hasContent ? (
          <Text size="sm" c="dimmed">
            No availability guidance returned for this appointment.
          </Text>
        ) : null}

        {aiSuggestion ? (
          <Stack gap="xs">
            <Text fw={600} size="md">
              Summary
            </Text>

            <Text size="sm">{aiSuggestion.brief}</Text>

            {aiSuggestion.topPick ? (
              <Group justify="space-between" align="flex-start">
                <Paper p="sm" withBorder>
                  <Flex gap="xs">
                    <ThemeIcon size="" px="xs" color="yellow">
                      <IoTrophy />
                    </ThemeIcon>

                    <Flex direction="column">
                      <Text size="md" fw={700}>
                        Best pick: {aiSuggestion.topPick.name}
                      </Text>
                      <Text mt="xs" size="sm" c="dimmed">
                        {aiSuggestion.topPick.reason}
                      </Text>
                    </Flex>
                  </Flex>
                </Paper>
              </Group>
            ) : null}
            <Divider />
            {aiSuggestion?.cautions.length ? (
              <Stack gap="xs">
                <Group gap="xs">
                  <Text fw={600} size="md">
                    Cautions
                  </Text>
                </Group>
                {aiSuggestion.cautions.map((caution, index) => (
                  <Text ml="xs" key={index} size="sm">
                    - {caution}
                  </Text>
                ))}
              </Stack>
            ) : null}
          </Stack>
        ) : null}

        {recommendedMembers.length > 0 ? (
          <>
            <Divider />
            <Stack gap="xs">
              <Text fw={600} size="md">
                Recommended
              </Text>
              {recommendedMembers.map((member) => (
                <Group
                  key={member.staff.id}
                  justify="space-between"
                  align="flex-start"
                >
                  <Box>
                    <Text size="sm" fw={600}>
                      {member.staff.name}
                    </Text>
                    <Text size="xs">
                      Reason:{" "}
                      {member.reason === "home" ? "Home" : "Last Job Location"}
                    </Text>
                  </Box>
                  <Badge color="green" variant="light">
                    Available
                  </Badge>
                </Group>
              ))}
            </Stack>
          </>
        ) : null}

        {aiSuggestion?.alternates.length ? (
          <>
            <Divider />
            <Stack gap="xs">
              <Text fw={600} size="md">
                Alternates
              </Text>

              {aiSuggestion.alternates.map((member) => (
                <Group
                  key={member.staffId}
                  justify="space-between"
                  align="flex-start"
                >
                  <Box>
                    <Text size="sm" fw={600}>
                      {member.name}
                    </Text>
                    <Text size="xs">{member.reason}</Text>
                  </Box>
                  <Badge color="blue" variant="light">
                    Alternate
                  </Badge>
                </Group>
              ))}
            </Stack>
          </>
        ) : null}

        {unavailableMembers.length > 0 ? (
          <>
            <Divider />
            <Stack gap="xs">
              <Group gap="xs">
                <Text fw={600} size="md">
                  Unavailable
                </Text>
              </Group>

              {unavailableMembers.map((member) => {
                const hasLeaveConflict = (member.leaves?.length ?? 0) > 0;
                const hasAssignmentConflict =
                  (member.assignments?.length ?? 0) > 0;
                const reasons = [
                  hasLeaveConflict ? "Leave conflict" : null,
                  hasAssignmentConflict ? "Schedule conflict" : null,
                ]
                  .filter(Boolean)
                  .join(" • ");

                return (
                  <Group
                    key={member.id}
                    justify="space-between"
                    align="flex-start"
                  >
                    <Box>
                      <Text size="sm" fw={600}>
                        {member.name}
                      </Text>
                      <Text size="sm">
                        {reasons || "Not recommended for this slot"}
                      </Text>
                    </Box>
                    <Badge color="red" variant="light">
                      Busy
                    </Badge>
                  </Group>
                );
              })}
            </Stack>
          </>
        ) : null}
      </Stack>
    </Card>
  );
};

export default AIStaffSuggestionCard;
