import { Stack } from "expo-router";

export default function TasksLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="[id]"
        options={{
          title: "Task Details",
          headerShown: false,
          headerTintColor: "#000",
        }}
      />
    </Stack>
  );
}
