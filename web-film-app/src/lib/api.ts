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
  HlsAnalyzeResponse,
  TrendingMoviesResponse,
  NewMoviesResponse,
  CommunityHighlightsResponse,
  CommentListResponse,
  Comment,
} from "../types/api";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, "");

export const buildApiUrl = (path: string) => {
  if (!path) return API_ROOT_URL;
  if (path.startsWith("http")) return path;
  if (path.startsWith("/api/")) {
    return `${API_ROOT_URL}${path}`;
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

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
    favorite: (id: string) =>
      apiFetch<{ message: string; movieId: string }>(`/movies/${id}/favorite`, {
        method: "POST",
      }),
    unfavorite: (id: string) =>
      apiFetch<{ message: string; movieId: string }>(`/movies/${id}/favorite`, {
        method: "DELETE",
      }),
    favoriteStatus: (id: string) =>
      apiFetch<{ favorite: boolean }>(`/movies/${id}/favorite`, {
        method: "GET",
      }),
    trending: (query: Record<string, string | number | undefined> = {}) => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      const qs = params.toString();
      return apiFetch<TrendingMoviesResponse>(
        `/movies/trending${qs ? `?${qs}` : ""}`
      );
    },
    latest: (query: Record<string, string | number | undefined> = {}) => {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      const qs = params.toString();
      return apiFetch<NewMoviesResponse>(`/movies/new${qs ? `?${qs}` : ""}`);
    },
    communityHighlights: () =>
      apiFetch<CommunityHighlightsResponse>(`/movies/community-highlights`),
    comments: (movieId: string, limit?: number) =>
      apiFetch<CommentListResponse>(
        `/movies/${movieId}/comments${
          limit ? `?limit=${encodeURIComponent(String(limit))}` : ""
        }`
      ),
    addComment: (movieId: string, payload: { content: string }) =>
      apiFetch<{ comment: Comment }>(`/movies/${movieId}/comments`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  hls: {
    analyze: (payload: { url: string; headers?: Record<string, string> }) =>
      apiFetch<HlsAnalyzeResponse>(`/hls/analyze`, {
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
    updateProfile: (
      id: string,
      payload: { avatar?: string; currentPassword?: string; newPassword?: string }
    ) =>
      apiFetch<{ user: ProfileResponse["user"] }>(`/auth/profile/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
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
