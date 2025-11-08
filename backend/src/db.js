import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { generateId } from "./utils/id.js";

const dataDir = join(process.cwd(), "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, "lumi_ai.json");

const defaultState = {
  movies: [],
  users: [],
  reviews: [],
  watch_history: [],
  favorites: [],
};

const loadState = () => {
  if (!existsSync(dbPath)) {
    return { ...defaultState };
  }
  try {
    const raw = readFileSync(dbPath, "utf-8");
    return { ...defaultState, ...JSON.parse(raw) };
  } catch (error) {
    console.error("Không thể đọc DB, tạo mới:", error);
    return { ...defaultState };
  }
};

const state = loadState();

const persist = () => {
  writeFileSync(dbPath, JSON.stringify(state, null, 2), "utf-8");
};

const seedMovies = [
  {
    id: "nightfall-echoes",
    slug: "nightfall-echoes",
    title: "Nightfall Echoes",
    synopsis:
      "Đặc vụ Ava Reyes điều tra chuỗi tín hiệu bí ẩn phát ra từ rìa hệ Mặt Trời và phát hiện âm mưu thao túng ký ức loài người.",
    year: 2024,
    duration: "2h 08m",
    rating: 4.7,
    thumbnail:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tags: ["Sci-fi", "Thriller", "Mystery"],
    moods: ["Hành động", "Huyền bí"],
    cast: ["Liam Anderson", "Zoey Carter", "Ken Watanabe"],
    director: "Aurora Lang",
  },
  {
    id: "echoes-of-sakura",
    slug: "echoes-of-sakura",
    title: "Echoes of Sakura",
    synopsis:
      "Hai nghệ sĩ trẻ vô tình kết nối qua những cánh thư ảo, cùng nhau sưởi ấm ký ức tuổi thơ dưới tán hoa anh đào Kyoto.",
    year: 2023,
    duration: "1h 52m",
    rating: 4.5,
    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=XfR9iY5y94s",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    tags: ["Romance", "Drama"],
    moods: ["Lãng mạn"],
    cast: ["Haruka Abe", "Kei Tanaka", "Lucy Liu"],
    director: "Naomi Kurosawa",
  },
  {
    id: "parallel-laughter",
    slug: "parallel-laughter",
    title: "Parallel Laughter",
    synopsis:
      "Nhà khoa học kỳ quặc phát minh thiết bị mở cổng sang timeline vui vẻ nhất nhưng lại vô tình nhân bản chính mình.",
    year: 2022,
    duration: "1h 37m",
    rating: 4.2,
    thumbnail:
      "https://images.unsplash.com/photo-1554941829-202a0b2403b0?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=kXYiU_JCYtU",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    tags: ["Comedy", "Sci-fi"],
    moods: ["Hài hước", "Khoa học viễn tưởng"],
    cast: ["Ryan Reynolds", "Awkwafina", "John Boyega"],
    director: "Dax Shepherd",
  },
  {
    id: "lunar-harbor",
    slug: "lunar-harbor",
    title: "Lunar Harbor",
    synopsis:
      "Cảng không gian trên Mặt Trăng trở thành nơi trú ẩn bí mật cho những con người muốn bỏ lại Trái Đất phía sau.",
    year: 2025,
    duration: "2h 15m",
    rating: 4.6,
    thumbnail:
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=Zi_XLOBDo_Y",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    tags: ["Adventure", "Drama"],
    moods: ["Hành động", "Tài liệu"],
    cast: ["Gemma Chan", "Mahershala Ali", "Timothée Chalamet"],
    director: "Denis Ortega",
  },
  {
    id: "midnight-noir",
    slug: "midnight-noir",
    title: "Midnight Noir",
    synopsis:
      "Thám tử ở Sài Gòn tương lai sử dụng AI để đọc cảm xúc tội phạm, đối mặt vụ án khiến ranh giới người-máy mờ dần.",
    year: 2024,
    duration: "1h 58m",
    rating: 4.3,
    thumbnail:
      "https://images.unsplash.com/photo-1505245208761-ba872912fac0?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=E7wJTI-1dvQ",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    tags: ["Neo noir", "Crime"],
    moods: ["Huyền bí"],
    cast: ["Johnny Trí Nguyễn", "Ngô Thanh Vân", "Lana Condor"],
    director: "Victor Vũ",
  },
  {
    id: "starlit-cuisine",
    slug: "starlit-cuisine",
    title: "Starlit Cuisine",
    synopsis:
      "Show ẩm thực viễn tưởng nơi các đầu bếp thi đấu trong không gian không trọng lực, kết hợp khoa học và nghệ thuật.",
    year: 2021,
    duration: "10 tập · 45m/tập",
    rating: 4.1,
    thumbnail:
      "https://images.unsplash.com/photo-1432139509613-5c4255815697?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=3fumBcKC6RE",
    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    tags: ["Reality", "Cooking", "Sci-fi"],
    moods: ["Hài hước", "Hoạt hình"],
    cast: ["Padma Lakshmi", "Simu Liu"],
    director: "Jon Favreau",
  },
];

const seedUsers = [
  {
    id: "demo-user",
    name: "Minh Anh",
    email: "minhanh@example.com",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
    role: "user",
    password: "123456",
  },
  {
    id: "admin-user",
    name: "Admin Lumi",
    email: "admin@lumi.ai",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
    role: "admin",
    password: "admin123",
  },
];

const ensureSeedData = () => {
  if (!state.movies.length) {
    state.movies = seedMovies;
  }

  if (!state.users.length) {
    state.users = seedUsers.map((user) => ({
      ...user,
      password_hash: bcrypt.hashSync(user.password, 10),
    }));
  }

  if (!state.reviews.length) {
    state.reviews = [
      {
        id: "rv-1",
        user_id: "demo-user",
        movie_id: "nightfall-echoes",
        rating: 4.5,
        comment: "Căng thẳng, âm nhạc và hình ảnh cực kỳ ấn tượng!",
        sentiment: "positive",
        created_at: new Date().toISOString(),
      },
      {
        id: "rv-2",
        user_id: "demo-user",
        movie_id: "echoes-of-sakura",
        rating: 4.0,
        comment: "Phim nhẹ nhàng, rất hợp xem cuối tuần.",
        sentiment: "positive",
        created_at: new Date().toISOString(),
      },
    ];
  }

  persist();
};

ensureSeedData();

const matchesQuery = (value, keyword) =>
  value.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;

const findMovieIndex = (idOrSlug) =>
  state.movies.findIndex(
    (movie) => movie.id === idOrSlug || movie.slug === idOrSlug
  );

export const listMovies = ({ q, mood, tag, limit = 12 } = {}) => {
  let items = state.movies;

  if (q) {
    items = items.filter(
      (movie) =>
        matchesQuery(movie.title, q) || matchesQuery(movie.synopsis, q)
    );
  }

  if (mood) {
    items = items.filter((movie) => movie.moods.includes(mood));
  }

  if (tag) {
    items = items.filter((movie) => movie.tags.includes(tag));
  }

  return items.slice(0, Math.min(limit, 50));
};

export const getMovie = (idOrSlug) => {
  const index = findMovieIndex(idOrSlug);
  if (index === -1) return null;
  return state.movies[index];
};

export const getRandomMovies = ({ excludeId, limit = 4 } = {}) => {
  const filtered = state.movies.filter((movie) => movie.id !== excludeId);
  return filtered
    .sort(() => Math.random() - 0.5)
    .slice(0, limit);
};

export const insertMovie = (payload) => {
  state.movies.push(payload);
  persist();
  return payload;
};

export const updateMovie = (idOrSlug, updates) => {
  const index = findMovieIndex(idOrSlug);
  if (index === -1) return null;
  state.movies[index] = { ...state.movies[index], ...updates };
  persist();
  return state.movies[index];
};

export const deleteMovie = (idOrSlug) => {
  const index = findMovieIndex(idOrSlug);
  if (index === -1) return false;
  state.movies.splice(index, 1);
  persist();
  return true;
};

export const insertReview = (review) => {
  state.reviews.unshift({
    ...review,
    created_at: new Date().toISOString(),
  });
  persist();
  return review;
};

export const listReviewsByMovie = (movieId, limit = 5) => {
  return state.reviews
    .filter((review) => review.movie_id === movieId)
    .slice(0, limit)
    .map((review) => {
      const user = state.users.find((u) => u.id === review.user_id) || {};
      return {
        ...review,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
      };
    });
};

export const addUser = ({ name, email, password }) => {
  const id = generateId("user");
  const newUser = {
    id,
    name,
    email,
    role: "user",
    password_hash: bcrypt.hashSync(password, 10),
    created_at: new Date().toISOString(),
  };
  state.users.push(newUser);
  persist();
  return newUser;
};

export const findUserByEmail = (email) =>
  state.users.find((user) => user.email === email);

export const getUserById = (id) => state.users.find((user) => user.id === id);

export const listUsers = () =>
  state.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  }));

export const getStats = () => ({
  movies: state.movies.length,
  users: state.users.length,
  reviews: state.reviews.length,
  watch_history: state.watch_history.length,
  moods: state.movies
    .flatMap((movie) => movie.moods)
    .reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {}),
});

export const listWatchHistory = (userId) =>
  state.watch_history
    .filter((item) => item.user_id === userId)
    .map((item) => ({
      ...item,
      movie: getMovie(item.movie_id),
    }));

export const addWatchHistory = ({ userId, movieId }) => {
  state.watch_history.unshift({
    id: generateId("history"),
    user_id: userId,
    movie_id: movieId,
    last_watched_at: new Date().toISOString(),
  });
  persist();
};

export const addFavorite = ({ userId, movieId }) => {
  const exists = state.favorites.find(
    (fav) => fav.user_id === userId && fav.movie_id === movieId
  );
  if (!exists) {
    state.favorites.push({
      id: generateId("fav"),
      user_id: userId,
      movie_id: movieId,
      created_at: new Date().toISOString(),
    });
    persist();
  }
};

export const listFavorites = (userId, limit = 6) => {
  return state.favorites
    .filter((fav) => fav.user_id === userId)
    .slice(0, limit)
    .map((fav) => getMovie(fav.movie_id));
};
