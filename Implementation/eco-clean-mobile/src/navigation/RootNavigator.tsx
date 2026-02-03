import { NavigationContainer } from "@react-navigation/native";
// import { useAuth } from "@/hooks/useAuth";
import AuthNavigator from "../navigation/AuthNavigator";
import AdminNavigator from "../navigation/AdminNavigator";
import CleanerNavigator from "../navigation/CleanerNavigation";
import CustomerNavigator from "../navigation/CustomerNavigation";
import { ActivityIndicator, View } from "react-native";

export default function RootNavigator() {
  //   const { user, loading } = useAuth();
  const loading = false;
  const user = {
    role: "ADMIN",
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (user.role === "ADMIN") {
    return <AdminNavigator />;
  }

  if (user.role === "CLEANER") {
    return <CleanerNavigator />;
  }

  return <CustomerNavigator />;
}
