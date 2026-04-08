"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  Container,
  Flex,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { useState } from "react";
import { IoCloseCircle } from "react-icons/io5";

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
    <Box
      mih="100vh"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(132, 204, 22, 0.18), transparent 24%), radial-gradient(circle at bottom right, rgba(163, 230, 53, 0.16), transparent 22%), linear-gradient(180deg, #f8fafc 0%, #f3f7ec 100%)",
      }}
    >
      <Container size="sm" py="xl" h="100vh">
        <Flex h="100%" align="center" justify="center">
          <Card
            withBorder
            radius="xl"
            p="xl"
            w="100%"
            maw={520}
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
              borderColor: "rgba(203, 213, 225, 0.9)",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.12)",
            }}
          >
            <Stack gap="lg">
              <Flex justify="center">
                <Box
                  p="sm"
                  style={{
                    borderRadius: "24px",
                    background:
                      "linear-gradient(180deg, rgba(247, 254, 231, 1), rgba(255, 255, 255, 1))",
                    boxShadow: "inset 0 0 0 1px rgba(132, 204, 22, 0.18)",
                  }}
                >
                  <Image
                    src="/logo.png"
                    alt="Eco Clean"
                    width={88}
                    height={88}
                    priority
                  />
                </Box>
              </Flex>

              <Stack gap={6} ta="center">
                <Title order={1} fz="2rem">
                  Log In
                </Title>
                <Text size="sm" c="dimmed">
                  Sign in to continue to the Eco Clean workspace.
                </Text>
              </Stack>

              {error && (
                <Alert
                  variant="light"
                  color="red"
                  radius="lg"
                  icon={<IoCloseCircle />}
                >
                  {error}
                </Alert>
              )}

              <Stack gap="md">
                <TextInput
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  size="md"
                  radius="lg"
                />

                <PasswordInput
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  size="md"
                  radius="lg"
                />
              </Stack>

              <Button
                fullWidth
                size="md"
                radius="xl"
                loading={loading}
                onClick={handleLogin}
              >
                Sign In
              </Button>
            </Stack>
          </Card>
        </Flex>
      </Container>
    </Box>
  );
}
