import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  authService,
  type UserProfile,
  type SignUpRequest,
} from "@/services/auth.service";
import { ApiError } from "@/services/api";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignUpRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Fetch user profile using current access token
  const fetchProfile = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authService.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // On mount: check stored tokens and try to restore session
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");

      if (!accessToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      // Try to fetch profile. The api layer handles 401 + auto-refresh.
      const success = await fetchProfile();
      if (!success) {
        // If profile fetch failed even after refresh, clear tokens
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }

      setIsLoading(false);
    };

    initAuth();
  }, [fetchProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await authService.signIn({ email, password });

      if (response.success && response.accessToken && response.refreshToken) {
        localStorage.setItem("accessToken", response.accessToken);
        localStorage.setItem("refreshToken", response.refreshToken);

        // Fetch full profile after login
        await fetchProfile();
      } else {
        throw new Error(response.message || "Login failed");
      }
    },
    [fetchProfile]
  );

  const signup = useCallback(async (data: SignUpRequest) => {
    const response = await authService.signUp(data);
    if (!response.success) {
      throw new Error(response.message || "Signup failed");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { ApiError };
