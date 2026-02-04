import LoginScreen from "@/screens/LoginScreen";
import { useAuth } from "@/context/AuthContext";
import { Redirect } from "expo-router";

export default function Index() {
  const { isAuthenticated } = useAuth();
  console.log(isAuthenticated);

  if (isAuthenticated) {
    return <Redirect href="/tasks" />;
  }

  return <LoginScreen />;
}
