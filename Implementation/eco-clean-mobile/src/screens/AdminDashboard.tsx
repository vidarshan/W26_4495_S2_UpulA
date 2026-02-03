import { View, Text, Button, StyleSheet } from "react-native";
// import { useAuth } from "@/";

export default function AdminDashboard() {
  //   const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>

      <Text style={styles.subtitle}>
        {/* Welcome{user?.name ? `, ${user.name}` : ""} 👋 */}
      </Text>

      {/* <Text style={styles.role}>Role: {user?.role}</Text> */}

      <View style={styles.actions}>
        <Button title="Manage Users" onPress={() => {}} />
        <Button title="View Jobs" onPress={() => {}} />
        {/* <Button title="Logout" color="red" onPress={logout} /> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "red",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  role: {
    fontSize: 14,
    marginBottom: 24,
    color: "#666",
  },
  actions: {
    gap: 12,
  },
});
