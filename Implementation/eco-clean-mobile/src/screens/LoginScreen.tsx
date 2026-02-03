import { Button } from "@/components/Button";
import Container from "@/components/Container";
import { Input } from "@/components/Input";
import Spacer from "@/components/Spacer";
import { Title } from "@/components/Title";
import { RootStackParamList } from "@/navigation/types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { View } from "react-native";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const LoginScreen = ({ navigation }: Props) => {
  return (
    <Container>
      <View>
        <Title>Log In</Title>
        <Spacer size={16} />
        <Input placeholder="Enter your email" />
        <Spacer />
        <Input placeholder="Enter your password" textContentType="password" />
        <Spacer size={16} />
        <Button title="Log In" />
        <Spacer size={16} />
        <Button
          variant="outline"
          title="New User?"
          onPress={() => navigation.navigate("Signup")}
        />
        <Spacer size={16} />
      </View>
    </Container>
  );
};

export default LoginScreen;
