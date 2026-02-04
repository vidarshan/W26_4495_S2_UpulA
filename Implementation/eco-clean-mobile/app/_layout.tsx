import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/Loader";
import { Stack } from "expo-router";

function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullscreen />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
