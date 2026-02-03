import { createContext, useContext, useEffect, useState } from "react";
import { getToken, saveToken, removeToken } from "../storage/auth.storage";

type AuthContextType = {
  isAuthenticated: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>(null as any);

export function AuthProvider({ children }: any) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getToken().then((token) => {
      setIsAuthenticated(!!token);
      setLoading(false);
    });
  }, []);

  const signIn = async (token: string) => {
    await saveToken(token);
    setIsAuthenticated(true);
  };

  const signOut = async () => {
    await removeToken();
    setIsAuthenticated(false);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
