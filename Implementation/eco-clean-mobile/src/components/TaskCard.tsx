import { colors } from "@/theme";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";

interface TaskCardProps {
  type: string;
  task: any; //TODO: change this when DB Modelling is done
}

const TaskCard = ({ type, task }: TaskCardProps) => {
  const router = useRouter();

  const handlepress = (id: string) => {
    router.push(`/tasks/${task.id}`);
  };

  return (
    <Pressable style={styles.card} onPress={() => handlepress("static_id")}>
      <Text style={styles.title}>
        {type === "ongoing" ? "ONGOING" : "UPCOMING"} TASKS
      </Text>

      <View style={styles.row}>
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.time}>30 mins left</Text>
      </View>

      <Text style={styles.address}>7th Street, V33 KKS</Text>
    </Pressable>
  );
};

export default TaskCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginVertical: 10,
    // Android shadow
    elevation: 4,
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Comic-Bold",
    color: colors.primary,
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    fontFamily: "Comic-Bold",
  },

  time: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
    fontFamily: "Comic-Bold",
  },

  address: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563",
    fontFamily: "Comic-Bold",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
});
