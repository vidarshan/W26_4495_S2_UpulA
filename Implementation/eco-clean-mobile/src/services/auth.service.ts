import { saveToken } from "@/storage/auth.storage";
import { apiFetch } from "./api";

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};

export async function login(email: string, password: string) {
  const data: LoginResponse = await apiFetch("/api/mobile/login", {
    method: "POST",
    body: {
      email,
      password,
    },
  });

  await saveToken(data.token);

  return data.user;
}
