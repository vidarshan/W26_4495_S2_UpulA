import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import Container from "@/components/Container";
import { Input } from "@/components/Input";
import { Loader } from "@/components/Loader";
import Spacer from "@/components/Spacer";
import { Title } from "@/components/Title";
import { useAuth } from "@/context/AuthContext";
import { RootStackParamList } from "@/navigation/types";
import { ApiError } from "@/services/api";
import { login } from "@/services/auth.service";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { View } from "react-native";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const LoginScreen = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<null | string>(null);
  const [email, setEmail] = useState<string>("admin@ecoclean.com");
  const [password, setPassword] = useState<string>("password123");

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email, password, signIn);
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
      {loading ? (
        <Loader />
      ) : (
        <View>
          <Spacer size={10} />
          <Title>Log In</Title>
          <Spacer size={10} />
          {error && <Alert variant="error" title="Error" message={error} />}
          <Spacer size={10} />
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
      )}
    </Container>
  );
};

export default LoginScreen;
