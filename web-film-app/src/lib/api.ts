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
  AdminSendNotificationsResponse,
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
  InboxResponse,
  InboxUnreadCountResponse,
  InboxMarkReadResponse,
  HistoryResponse,
} from "../types/api";

const envApi = import.meta.env.VITE_API_BASE_URL;
const originApi =
  typeof window !== "undefined"
    ? `${window.location.origin.replace(/\/$/, "")}/api`
    : "http://localhost:4000/api";

export const API_BASE_URL =
  envApi && String(envApi).trim().length ? envApi : originApi;

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
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
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
    watch: (id: string, episode?: number) =>
      apiFetch<WatchResponse>(
        `/movies/${id}/watch${
          episode ? `?ep=${encodeURIComponent(String(episode))}` : ""
        }`
      ),
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
    addView: (
      movieId: string,
      payload: { viewerId?: string; episode?: number }
    ) =>
      apiFetch<{ success: boolean }>(`/movies/${movieId}/view`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  hls: {
    analyze: (payload: {
      url: string;
      headers?: Record<string, string>;
      roomId?: string;
    }) =>
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
    chatbot: (payload: unknown) =>
      apiFetch<ChatResponse>(`/ai/chatbot`, {
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
      payload: {
        avatar?: string;
        currentPassword?: string;
        newPassword?: string;
        favoriteMoods?: string[];
        themePreference?: "system" | "light" | "dark";
      }
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
    sendNotifications: (payload: {
      userIds: string[];
      title?: string;
      content: string;
      senderType?: "admin" | "bot";
    }) =>
      apiFetch<AdminSendNotificationsResponse>(`/admin/notifications`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    toggleMovieVisibility: (
      movieId: string,
      isHidden: boolean,
      unhideDate?: string
    ) =>
      apiFetch<{ message: string; movie: Movie }>(
        `/admin/movies/${movieId}/toggle-visibility`,
        {
          method: "POST",
          body: JSON.stringify({ isHidden, unhideDate }),
        }
      ),
  },
  upload: {
    single: async (file: File) => {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE_URL}/upload/single`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || "Upload failed");
      }

      const result = await response.json();
      return result.fullUrl as string;
    },
    deleteTemp: (url: string) =>
      apiFetch<{ deleted: boolean }>(`/upload/temp`, {
        method: "DELETE",
        body: JSON.stringify({ url }),
      }),
  },
  notifications: {
    list: () => apiFetch<InboxResponse>(`/notifications`),
    unreadCount: () =>
      apiFetch<InboxUnreadCountResponse>(`/notifications/unread-count`),
    markRead: () =>
      apiFetch<InboxMarkReadResponse>(`/notifications/mark-read`, {
        method: "POST",
      }),
  },
  history: {
    list: (params: { page?: number; limit?: number } = {}) => {
      const search = new URLSearchParams();
      if (params.page) search.set("page", String(params.page));
      if (params.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return apiFetch<HistoryResponse>(`/history${qs ? `?${qs}` : ""}`);
    },
    add: (movieId: string) =>
      apiFetch(`/history`, {
        method: "POST",
        body: JSON.stringify({ movieId }),
      }),
    update: (payload: {
      movieId: string;
      episode?: number;
      position?: number;
    }) =>
      apiFetch(`/history/update`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    resume: (movieId: string) =>
      apiFetch<{
        item: { movieId: string; episode?: number; position?: number } | null;
      }>(`/history/resume?movieId=${encodeURIComponent(movieId)}`),
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
