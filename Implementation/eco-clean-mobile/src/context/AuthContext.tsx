import { createContext, useContext, useEffect, useState } from "react";
import { getToken, saveToken, removeToken } from "../storage/auth.storage";
import { usePathname, useRouter } from "expo-router";

type AuthContextType = {
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null as any);

export function AuthProvider({ children }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = await getToken();
      setIsAuthenticated(!!token);

      if (token) {
        setIsAuthenticated(true);
        if (pathname === "/") {
          router.replace("/tasks");
        }
      }

      setIsLoading(false);
    };
    bootstrap();
  }, [router, pathname]);

  const signIn = async (token: string) => {
    await saveToken(token);
    setIsAuthenticated(true);
    router.replace("/tasks");
  };

  const signOut = async () => {
    await removeToken();
    setIsAuthenticated(false);
    router.replace("/");
  };

  if (isLoading) return null;

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, signIn, signOut, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
