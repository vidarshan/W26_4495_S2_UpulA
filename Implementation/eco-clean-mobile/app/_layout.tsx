import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { Stack } from "expo-router";
import { colors } from "@/theme";

function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullscreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTitle: "",
        headerTintColor: "#fff",
        headerBackTitle: "Tasks",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
