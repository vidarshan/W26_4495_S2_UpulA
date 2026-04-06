"use client";

import {
    Modal,
    Stack,
    Title,
    Text,
    Group,
    Badge,
    Paper,
    Button,
    Divider,
    Grid,
} from "@mantine/core";
import { IoCallOutline, IoHomeOutline, IoPersonOutline } from "react-icons/io5";
import { useState } from "react"
import { ActionIcon, TextInput, NumberInput } from "@mantine/core";
import { IoPencilOutline } from "react-icons/io5";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FinancialDetailsModal from "../popups/FinancialDetailsModal";

type Props = {
    opened: boolean;
    onClose: () => void;
    staff: any; // we’ll type later
};

export default function AdminStaffDetailsModal({
    opened,
    onClose,
    staff,
}: Props) {
    console.log("MODAL STAFF:", staff);

    const [isSaving, setIsSaving] = useState(false);
    const [editingField, setEditingField] = useState<
        "position" | "rate" | null
    >(null);
    const [financialOpen, setFinancialOpen] = useState(false);

    const fetchStaffDetails = async (id: string) => {
        console.log("FETCHING STAFF ID:", id); // 👈 ADD THIS

        const res = await fetch(`/api/admin/staff/${id}`);
        if (!res.ok) throw new Error("Failed");

        return res.json();
    };

    const { data, isLoading } = useQuery({
        queryKey: ["admin-staff", staff?.id],
        queryFn: () => fetchStaffDetails(staff.id),
        enabled: !!staff?.id,
    });

    const queryClient = useQueryClient();

    const profile = data?.staffProfile ?? staff?.staffProfile;
    const address = profile?.staffAddress;
    const emergency = profile?.emergencyContact;

    const [position, setPosition] = useState(profile?.position || "");
    const [rate, setRate] = useState(profile?.hourlyRate || 0);


    const handleSave = async () => {
        try {
            setIsSaving(true);

            await fetch(`/api/admin/staff/${staff.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    position,
                    hourlyRate: rate,
                }),
            });


            queryClient.invalidateQueries({
                queryKey: ["admin-staff", staff.id],
            });

            console.log("Saved!");

        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinancial = () => {
        console.log("Open financial details");
    };


    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Staff Details"
            size="lg"
            centered
        >
            <Stack gap="md">
                {/* HEADER */}
                <Stack gap={4}>
                    <Title order={4}>{staff?.name}</Title>

                    <Group gap="xs">
                        <Badge>{staff?.role}</Badge>

                        {profile?.staffId && (
                            <Badge variant="light">ID: {profile.staffId}</Badge>
                        )}
                    </Group>
                </Stack>

                <Divider />

                {/* BASIC INFO */}
                <Paper withBorder p="md" radius="md">
                    <Stack gap="xs">
                        <Text fw={600}>Basic Info</Text>

                        <Text size="sm">Email: {staff?.email}</Text>
                        {/* POSITION */}
                        <Group gap="xs">
                            <Text size="sm">Position:</Text>

                            {editingField === "position" ? (
                                <TextInput
                                    value={position}
                                    onChange={(e) => setPosition(e.currentTarget.value)}
                                    size="xs"
                                    autoFocus
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") setEditingField(null);
                                    }}
                                />
                            ) : (
                                <>
                                    <Text size="sm">{position || "—"}</Text>
                                    <ActionIcon
                                        size="xs"
                                        variant="subtle"
                                        onClick={() => setEditingField("position")}
                                    >
                                        <IoPencilOutline size={14} />
                                    </ActionIcon>
                                </>
                            )}
                        </Group>

                        {/* HOURLY RATE */}
                        <Group gap="xs">
                            <Text size="sm">Hourly Rate:</Text>

                            {editingField === "rate" ? (
                                <NumberInput
                                    value={rate}
                                    onChange={(val) => setRate(Number(val) || 0)}
                                    size="xs"
                                    min={0}
                                    decimalScale={2}
                                    autoFocus
                                    onBlur={() => setEditingField(null)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") setEditingField(null);
                                    }}
                                />
                            ) : (
                                <>
                                    <Text size="sm">${rate.toFixed(2)}</Text>
                                    <ActionIcon
                                        size="xs"
                                        variant="subtle"
                                        onClick={() => setEditingField("rate")}
                                    >
                                        <IoPencilOutline size={14} />
                                    </ActionIcon>
                                </>
                            )}
                        </Group>
                    </Stack>
                </Paper>

                {/* CONTACT */}
                <Paper withBorder p="md" radius="md">
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text fw={600}>Contact</Text>

                        </Group>

                        <Text size="sm">
                            <IoCallOutline />{" "}
                            {profile?.phoneNumber || "No contact number"}
                        </Text>
                    </Stack>
                </Paper>

                {/* ADDRESS + EMERGENCY */}
                <Grid>
                    <Grid.Col span={6}>
                        <Paper withBorder p="md" radius="md">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text fw={600}>Address</Text>

                                </Group>

                                {address ? (
                                    <>
                                        <Text size="sm">{address.street1}</Text>
                                        <Text size="sm">{address.street2}</Text>
                                        <Text size="sm">
                                            {address.city}, {address.province}
                                        </Text>
                                        <Text size="sm">{address.postalCode}</Text>
                                        <Text size="sm">{address.country}</Text>
                                    </>
                                ) : (
                                    <Text size="sm" c="dimmed">
                                        No address
                                    </Text>
                                )}
                            </Stack>
                        </Paper>
                    </Grid.Col>

                    <Grid.Col span={6}>
                        <Paper withBorder p="md" radius="md">
                            <Stack gap="xs">
                                <Group justify="space-between">
                                    <Text fw={600}>Emergency</Text>

                                </Group>

                                {emergency ? (
                                    <>
                                        <Text size="sm">{emergency.name}</Text>
                                        <Text size="sm">{emergency.phoneNumber}</Text>
                                        <Text size="sm">{emergency.relationship}</Text>
                                    </>
                                ) : (
                                    <Text size="sm" c="dimmed">
                                        No emergency contact
                                    </Text>
                                )}
                            </Stack>
                        </Paper>
                    </Grid.Col>
                </Grid>
                <Group mt="md" justify="space-between">
                    {/* LEFT SIDE */}
                    <Button
                        variant="light"
                        color="blue"
                        onClick={() => setFinancialOpen(true)}
                    >
                        Financial Details
                    </Button>

                    {/* RIGHT SIDE */}
                    <Group>
                        <Button variant="default" onClick={onClose}>
                            Cancel
                        </Button>

                        <Button loading={isSaving} onClick={handleSave}>
                            Save
                        </Button>
                    </Group>
                </Group>
            </Stack>
            <FinancialDetailsModal
                opened={financialOpen}
                onClose={() => setFinancialOpen(false)}
                staffId={staff.id}
            />
        </Modal>


    );
}