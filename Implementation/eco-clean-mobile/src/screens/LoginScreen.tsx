import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import Container from "@/components/Container";
import { Input } from "@/components/Input";
import Spacer from "@/components/Spacer";
import { Title } from "@/components/Title";
import { RootStackParamList } from "@/navigation/types";
import { ApiError } from "@/services/api";
import { login } from "@/services/auth.service";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { View } from "react-native";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const LoginScreen = ({ navigation }: Props) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<null | string>(null);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <View>
        <Spacer size={10} />
        <Title>Log In</Title>
        <Spacer size={10} />
        {error && (
          <>
            <Spacer size={16} />{" "}
            <Alert variant="error" title="Error" message={error} />
          </>
        )}
        <Input
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
        />
        <Spacer />
        <Input
          placeholder="Enter your password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
        />
        <Spacer size={16} />
        <Button title="Log In" onPress={handleLogin} />
        <Spacer size={16} />
      </View>
    </Container>
  );
};

export default LoginScreen;
