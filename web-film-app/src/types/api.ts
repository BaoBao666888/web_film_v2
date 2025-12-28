export interface MovieSummary {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  tags?: string[];
}

export interface Movie extends MovieSummary {
  slug: string;
  type?: "single" | "series";
  synopsis: string;
  year: number;
  rating: number;
  poster: string;
  trailerUrl?: string;
  videoUrl?: string;
  videoType?: "mp4" | "hls";
  videoHeaders?: Record<string, string>;
  moods: string[];
  cast: string[];
  director: string;
  episodes?: Episode[];
  country?: string;
  seriesStatus?: "Còn tiếp" | "Hoàn thành" | "Tạm ngưng" | "";
  isHidden?: boolean;
  unhideDate?: string;
}

export interface Episode {
  number: number;
  title: string;
  duration?: string;
  videoUrl?: string;
  videoType?: "mp4" | "hls";
}

export interface MovieListResponse {
  items: Movie[];
  meta: {
    total: number;
    query: string;
  };
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  sentiment?: string;
  created_at?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  movie?: {
    id: string;
    title: string;
    thumbnail?: string;
  } | null;
}

export interface Comment {
  id: string;
  content: string;
  created_at?: string;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  movie?: {
    id: string;
    title: string;
    thumbnail?: string;
  } | null;
}

export interface MovieDetailResponse {
  movie: Movie;
  reviews: Review[];
  suggestions: Movie[];
  ratingStats?: {
    average: number;
    count: number;
  };
}

export interface WatchResponse {
  movieId: string;
  title: string;
  synopsis: string;
  videoUrl: string;
  playbackType: "mp4" | "hls";
  stream?: {
    type: "mp4" | "hls";
    url: string;
    headers?: Record<string, string>;
  } | null;
  videoHeaders?: Record<string, string>;
  poster: string;
  trailerUrl?: string;
  tags: string[];
  type?: "single" | "series";
  episodes?: Episode[];
  currentEpisode?: Episode | null;
  views?: number;
  nextUp: Array<{
    id: string;
    movieId?: string;
    episodeNumber?: number;
    title: string;
    duration: string;
    thumbnail: string;
  }>;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  gradient: string;
  icon: string;
}

export interface PlaylistsResponse {
  items: Playlist[];
}

export interface RecommendationResponse {
  userId: string;
  strategy: string;
  playlists: Playlist[];
  items: Movie[];
}

export interface CommentListResponse {
  items: Comment[];
}

export interface MovieStatItem {
  movie: Movie;
  views?: number;
  favorites?: number;
  lastWatchedAt?: string;
  lastFavoriteAt?: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface HistoryItem {
  id: string;
  movieId: string;
  title: string;
  thumbnail: string;
  movieType?: "single" | "series";
  episode?: number;
  position?: number;
  lastWatchedAt?: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  meta: PaginatedMeta;
}

export interface TrendingMoviesResponse {
  items: MovieStatItem[];
  meta: PaginatedMeta & { days?: number };
}

export interface NewMoviesResponse {
  items: Movie[];
  meta: PaginatedMeta;
}

export interface CommunityHighlightsResponse {
  mostActive: MovieStatItem[];
  mostFavorited: MovieStatItem[];
  recentComments: Comment[];
}

export interface ChatSuggestion {
  id: string;
  title: string;
  synopsis: string;
  thumbnail: string;
}

export interface ChatResponse {
  userId: string;
  reply: string;
  suggestions: ChatSuggestion[];
}

export interface ProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    created_at?: string;
    favorite_moods?: string[];
    theme_preference?: "system" | "light" | "dark";
    balance?: number;
  };
  favorites: MovieSummary[];
  history: Array<{
    id: string;
    movieId: string;
    title: string;
    thumbnail: string;
    movieType?: "single" | "series";
    episode?: number;
    position?: number;
    lastWatchedAt?: string;
  }>;
}

export interface AdminStatsResponse {
  metrics: Array<{ label: string; value: number }>;
  topMoods: Array<{ mood: string; total: number }>;
}

export interface AdminUsersResponse {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    created_at?: string;
    favorite_moods?: string[];
    balance?: number;
    is_locked?: boolean;
    locked_reason?: string | null;
    locked_at?: string | null;
    locked_by?: string | null;
    locked_until?: string | null;
  }>;
}

export interface UserLockLogEntry {
  id: string;
  user_id: string;
  action: "lock" | "unlock";
  reason: string;
  unlock_at?: string | null;
  created_by?: string;
  created_at?: string;
}

export interface AdminUserLockLogsResponse {
  items: UserLockLogEntry[];
  meta: PaginatedMeta;
}

export interface WalletLedgerEntry {
  id: string;
  user_id: string;
  amount: number;
  type: "topup" | "purchase" | "admin_adjust" | "reversal" | "refund" | "admin_daily";
  ref_id?: string;
  note?: string;
  created_by?: string;
  created_at?: string;
}

export interface AdminWalletLedgerResponse {
  items: WalletLedgerEntry[];
  meta: PaginatedMeta;
}

export interface AdminWalletLedgerEligibleResponse {
  items: WalletLedgerEntry[];
}


export interface AdminMoviesResponse {
  movies: Movie[];
  meta?: PaginatedMeta;
}

export interface InboxMessage {
  id: string;
  title?: string;
  content: string;
  senderType?: "admin" | "bot";
  senderName?: string;
  createdAt?: string;
  readAt?: string | null;
}

export interface InboxResponse {
  items: InboxMessage[];
  meta: PaginatedMeta;
}

export interface InboxUnreadCountResponse {
  count: number;
}

export interface InboxMarkReadResponse {
  success: boolean;
  readAt?: string;
}

export interface AdminSendNotificationsResponse {
  sent: number;
  skipped?: number;
}

export interface RatingResponse {
  id: string;
  movieId: string;
  rating: number;
  comment?: string;
  sentiment?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    theme_preference?: "system" | "light" | "dark";
    role?: string;
    favorite_moods?: string[];
    balance?: number;
  };
}

export interface AiDashboardResponse {
  watchCount: number;
  reviewCount: number;
  avgMoodScore: number;
}

export interface HlsQuality {
  id: string;
  resolution?: string;
  bitrate?: number;
  proxiedUrl: string;
  url?: string;
}

export interface HlsAnalyzeResponse {
  type: "master" | "direct";
  qualities?: HlsQuality[];
  proxiedUrl?: string;
  url?: string;
}
