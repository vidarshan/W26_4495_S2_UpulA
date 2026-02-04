import { Text, Button } from "react-native";
import { useAuth } from "@/context/AuthContext";
import Container from "@/components/Container";

export default function Profile() {
  const { signOut } = useAuth();

  return (
    <Container>
      <Text>Profile screen</Text>

      <Button title="Logout" onPress={() => signOut()} />
    </Container>
  );
}
