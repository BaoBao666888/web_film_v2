import type {
  MovieListResponse,
  MovieDetailResponse,
  WatchResponse,
  RecommendationResponse,
  PlaylistsResponse,
  ChatResponse,
  ProfileResponse,
  AdminStatsResponse,
  AdminUsersResponse,
  AdminMoviesResponse,
  RatingResponse,
  AuthResponse,
  AiDashboardResponse,
  Movie,
} from "../types/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try {
      const errorBody = await response.json();
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  //THÊM TOKEN TỰ ĐỘNG
  const token = localStorage.getItem("authToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return handleResponse<T>(response);
}

export const api = {
  movies: {
    list: (query: Record<string, string | number | undefined> = {}) => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      const qs = params.toString();
      return apiFetch<MovieListResponse>(`/movies${qs ? `?${qs}` : ""}`);
    },
    detail: (id: string) => apiFetch<MovieDetailResponse>(`/movies/${id}`),
    watch: (id: string) => apiFetch<WatchResponse>(`/movies/${id}/watch`),
    create: (payload: Partial<Movie> & { title: string }) =>
      apiFetch<{ movie: Movie }>(`/movies`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Movie>) =>
      apiFetch<{ movie: Movie }>(`/movies/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      apiFetch<undefined>(`/movies/${id}`, { method: "DELETE" }),
    review: (id: string, payload: unknown) =>
      apiFetch(`/movies/${id}/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  ai: {
    recommendations: () =>
      apiFetch<RecommendationResponse>(`/ai/recommendations`),
    playlists: () => apiFetch<PlaylistsResponse>(`/ai/playlists`),
    chat: (payload: unknown) =>
      apiFetch<ChatResponse>(`/ai/chat`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    dashboard: () => apiFetch<AiDashboardResponse>(`/ai/dashboard`),
  },
  ratings: {
    submit: (payload: unknown) =>
      apiFetch<RatingResponse>(`/ratings`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    reviews: (movieId: string) => apiFetch(`/reviews/${movieId}`),
  },
  auth: {
    login: (payload: unknown) =>
      apiFetch<AuthResponse>(`/auth/login`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    register: (payload: unknown) =>
      apiFetch<AuthResponse>(`/auth/register`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    profile: (id: string) => apiFetch<ProfileResponse>(`/auth/profile/${id}`),
  },
  admin: {
    stats: () => apiFetch<AdminStatsResponse>(`/admin/stats`),
    users: () => apiFetch<AdminUsersResponse>(`/admin/users`),
    movies: () => apiFetch<AdminMoviesResponse>(`/admin/movies`),
  },
  history: {
    list: () => apiFetch(`/history`),
    add: (movieId: string) =>
      apiFetch(`/history`, {
        method: "POST",
        body: JSON.stringify({ movieId }),
      }),
    remove: (historyId: string) =>
      apiFetch(`/history/${historyId}`, {
        method: "DELETE",
      }),
    clear: () =>
      apiFetch(`/history`, {
        method: "DELETE",
      }),
  },
};
