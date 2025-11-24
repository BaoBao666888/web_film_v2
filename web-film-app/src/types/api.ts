export interface MovieSummary {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  tags?: string[];
}

export interface Movie extends MovieSummary {
  slug: string;
  synopsis: string;
  year: number;
  rating: number;
  poster: string;
  trailerUrl?: string;
  videoUrl?: string;
  moods: string[];
  cast: string[];
  director: string;
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
}

export interface MovieDetailResponse {
  movie: Movie;
  reviews: Review[];
  suggestions: Movie[];
}

export interface WatchResponse {
  movieId: string;
  title: string;
  synopsis: string;
  videoUrl: string;
  poster: string;
  trailerUrl?: string;
  tags: string[];
  nextUp: Array<{
    id: string;
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
  };
  favorites: MovieSummary[];
  history: Array<{
    id: string;
    movieId: string;
    title: string;
    thumbnail: string;
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
  }>;
}

export interface AdminMoviesResponse {
  movies: Movie[];
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
    role?: string;
  };
}

export interface AiDashboardResponse {
  watchCount: number;
  reviewCount: number;
  avgMoodScore: number;
}
