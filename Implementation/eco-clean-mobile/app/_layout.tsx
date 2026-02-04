import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { Stack } from "expo-router";

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullscreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="tasks" />
      ) : (
        <Stack.Screen name="index" />
      )}
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
