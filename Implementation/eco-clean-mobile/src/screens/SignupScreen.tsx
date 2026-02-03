import { Button } from "@/components/Button";
import Container from "@/components/Container";
import { Input } from "@/components/Input";
import Spacer from "@/components/Spacer";
import { Title } from "@/components/Title";
import { RootStackParamList } from "@/navigation/types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

const SignupScreen = ({ navigation }: Props) => {
  return (
    <Container>
      <Title>Register</Title>
      <Spacer size={16} />
      <Input placeholder="Enter your name" />
      <Spacer size={16} />
      <Input placeholder="Enter your email" />
      <Spacer size={16} />
      <Input placeholder="Enter your password" textContentType="password" />
      <Spacer size={16} />
      <Button title="Log In" />
      <Spacer size={16} />
      <Button
        variant="outline"
        title="Already have an account?"
        onPress={() => navigation.goBack()}
      />
    </Container>
  );
};

export default SignupScreen;
