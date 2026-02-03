import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminDashboard from "../screens/AdminDashboard";

const Stack = createNativeStackNavigator();

export default function AdminNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminHome" component={AdminDashboard} />
    </Stack.Navigator>
  );
}
