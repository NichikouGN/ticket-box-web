import { api } from "./api";

export interface SignUpRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  accessToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "ORGANIZER" | "STAFF" | "AUDIENCE";
  status: "ACTIVE" | "INACTIVE" | "BANNED";
  created_at?: string;
}

export interface ProfileResponse {
  success: boolean;
  data: UserProfile;
}

export const authService = {
  signUp: (data: SignUpRequest) =>
    api.post<AuthResponse>("/auth/sign-up", data, { skipAuth: true }),

  signIn: (data: SignInRequest) =>
    api.post<AuthResponse>("/auth/sign-in", data, { skipAuth: true }),

  refreshToken: (refreshToken: string) =>
    api.post<RefreshResponse>(
      "/auth/refresh-token",
      { refreshToken },
      { skipAuth: true }
    ),

  getProfile: () => api.get<ProfileResponse>("/profile"),
};
