export type MovieMood =
  | "Hành động"
  | "Lãng mạn"
  | "Kinh dị"
  | "Hài hước"
  | "Hoạt hình"
  | "Khoa học viễn tưởng"
  | "Huyền bí"
  | "Tài liệu";

export interface Movie {
  id: string;
  title: string;
  year: number;
  duration: string;
  genres: string[];
  description: string;
  rating: number;
  moods: MovieMood[];
  poster: string;
  thumbnail: string;
  cast: string[];
  director: string;
  trailerUrl?: string;
  isTrending?: boolean;
  isNew?: boolean;
}

export const featuredMovies: Movie[] = [
  {
    id: "nightfall-echoes",
    title: "Nightfall Echoes",
    year: 2024,
    duration: "2h 08m",
    genres: ["Hành động", "Khoa học viễn tưởng"],
    description:
      "Một đặc vụ điều tra những âm vang bí ẩn trong không gian và phát hiện ra bí mật có thể thay đổi lịch sử nhân loại.",
    rating: 4.7,
    moods: ["Hành động", "Huyền bí"],
    poster:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=600&q=80",
    cast: ["Liam Anderson", "Zoey Carter", "Ken Watanabe"],
    director: "Aurora Lang",
    trailerUrl: "https://www.youtube.com/watch?v=XfR9iY5y94s",
    isTrending: true,
  },
  {
    id: "echoes-of-sakura",
    title: "Echoes of Sakura",
    year: 2023,
    duration: "1h 52m",
    genres: ["Lãng mạn", "Drama"],
    description:
      "Câu chuyện cảm động về hai nghệ sĩ trẻ tìm lại bản thân giữa những mùa hoa anh đào rực rỡ tại Kyoto.",
    rating: 4.5,
    moods: ["Lãng mạn"],
    poster:
      "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=400&q=80",
    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    cast: ["Haruka Abe", "Kei Tanaka", "Lucy Liu"],
    director: "Naomi Kurosawa",
    isNew: true,
  },
  {
    id: "parallel-laughter",
    title: "Parallel Laughter",
    year: 2022,
    duration: "1h 37m",
    genres: ["Hài hước", "Giả tưởng"],
    description:
      "Một nhà khoa học chế tạo cỗ máy mở ra các dòng thời gian song song để tìm phiên bản hạnh phúc nhất của chính mình.",
    rating: 4.2,
    moods: ["Hài hước", "Khoa học viễn tưởng"],
    poster:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80",
    thumbnail:
      "/posters/parallel-laughter.jpg",
    cast: ["Ryan Reynolds", "Awkwafina", "John Boyega"],
    director: "Dax Shepherd",
  },
];

export const aiPlaylists = [
  {
    id: "cozy-sci-fi",
    title: "Khoa học viễn tưởng nhẹ nhàng",
    description:
      "Phù hợp khi bạn muốn phiêu lưu nhưng vẫn giữ mood chill vào cuối tuần.",
    gradient: "from-primary/80 to-secondary/80",
    icon: "🚀",
  },
  {
    id: "mood-lift",
    title: "Nâng mood liền tay",
    description:
      "Các phim comedy, feel-good giúp bạn hồi phục năng lượng sau giờ làm.",
    gradient: "from-orange-400/80 to-pink-500/80",
    icon: "🌈",
  },
  {
    id: "midnight-thrill",
    title: "Căng thẳng tối muộn",
    description: "Chọn lọc thriller gay cấn với twist khó đoán.",
    gradient: "from-emerald-500/80 to-cyan-500/80",
    icon: "🌌",
  },
];

export const chatbotExamples = [
  {
    user: "Tôi muốn xem phim hành động nhưng đừng quá nặng nề, cuối có hậu.",
    ai: "Bạn thử 'Parallel Laughter' nhé! Vừa vui nhộn vừa có yếu tố sci-fi thú vị.",
  },
  {
    user: "Có phim nào giống vibe Interstellar không?",
    ai: "Bạn sẽ thích 'Nightfall Echoes' – khai thác đề tài không gian nhưng vẫn tập trung vào chiều sâu cảm xúc.",
  },
  {
    user: "Xem phim gia đình cuối tuần thì nên coi gì?",
    ai: "Playlist 'Nâng mood liền tay' có nhiều phim phù hợp cả nhà cùng xem.",
  },
];

export const moods: MovieMood[] = [
  "Hành động",
  "Lãng mạn",
  "Kinh dị",
  "Hài hước",
  "Hoạt hình",
  "Khoa học viễn tưởng",
  "Huyền bí",
  "Tài liệu",
];
