import { ReusableBottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import Container from "@/components/Container";
import Spacer from "@/components/Spacer";
import TaskCard from "@/components/TaskCard";
import { Title } from "@/components/Title";
import { colors, radius } from "@/theme";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function Tasks() {
  const sheetRef = useRef(null);
  const router = useRouter();

  const tasks = [
    {
      id: "1",
      name: "John Doe",
      address: "7th Street, V33 KKS",
      remaining: "30 mins",
    },
    {
      id: "2",
      name: "Jane Smith",
      address: "Main Road, A12 BCD",
      remaining: "1 hr 10 mins",
    },
  ];

  return (
    <Container>
      <Title>Ongoing</Title>
      <Spacer size={8} />
      <TaskCard task={tasks[1]} type="ongoing" />
      <Spacer size={16} />

      <Title>Upcoming</Title>
      <Spacer size={10} />
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TaskCard task={item} type="upcoming" />}
        showsVerticalScrollIndicator={false}
      />
    </Container>
  );
}
