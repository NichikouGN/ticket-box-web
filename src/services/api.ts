const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Core fetch wrapper with auth token injection and auto-refresh on 401.
 */
async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(customHeaders as Record<string, string>),
  };

  // Attach access token if available and not skipped
  if (!skipAuth) {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...rest,
  });

  // If 401, attempt to refresh the token and retry once
  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = localStorage.getItem("accessToken");
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
      }
      response = await fetch(`${API_URL}${endpoint}`, {
        headers,
        ...rest,
      });
    } else {
      // Refresh failed — clear tokens
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || data.error || "Something went wrong",
      response.status,
      data
    );
  }

  return data as T;
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 */
async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.success && data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Custom API error with status code and response data.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { method: "GET", ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { method: "DELETE", ...options }),
};
