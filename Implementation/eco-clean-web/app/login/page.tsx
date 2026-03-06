"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import {
  Container,
  TextInput,
  Button,
  Title,
  Flex,
  Alert,
  Card,
  PasswordInput,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { IoCloseCircle } from "react-icons/io5";
import { getSession } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const session = await getSession();

    if (session?.user?.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/staff/tasks");
    }

    setLoading(false);
  }

  return (
    <Container h="100vh" size="xs">
      <Flex
        h="100%"
        display="flex"
        direction="column"
        justify="center"
        w="100%"
      >
        <Card withBorder>
          {error && (
            <Alert mb="sm" variant="light" color="red" icon={<IoCloseCircle />}>
              {error}
            </Alert>
          )}

          <Title order={2} mb="md">
            Login
          </Title>

          <TextInput
            label="Email"
            placeholder="Your email..."
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            mb="sm"
          />

          <PasswordInput
            label="Password"
            placeholder="Your password..."
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            mb="md"
          />

          <Button fullWidth loading={loading} onClick={handleLogin}>
            Sign In
          </Button>
        </Card>
      </Flex>
    </Container>
  );
}
