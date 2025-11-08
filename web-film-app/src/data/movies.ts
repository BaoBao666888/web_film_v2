import type { Movie, Playlist } from "../types/api";

export const featuredMovies: Movie[] = [
  {
    id: "nightfall-echoes",
    slug: "nightfall-echoes",
    title: "Nightfall Echoes",
    synopsis:
      "Một đặc vụ điều tra những âm vang bí ẩn trong không gian và phát hiện ra bí mật có thể thay đổi lịch sử nhân loại.",
    year: 2024,
    duration: "2h 08m",
    rating: 4.7,
    thumbnail:
      "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=XfR9iY5y94s",
    videoUrl:
      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    tags: ["Hành động", "Khoa học viễn tưởng"],
    moods: ["Hành động", "Huyền bí"],
    cast: ["Liam Anderson", "Zoey Carter", "Ken Watanabe"],
    director: "Aurora Lang",
  },
  {
    id: "echoes-of-sakura",
    slug: "echoes-of-sakura",
    title: "Echoes of Sakura",
    synopsis:
      "Câu chuyện cảm động về hai nghệ sĩ trẻ tìm lại bản thân giữa mùa hoa anh đào Kyoto.",
    year: 2023,
    duration: "1h 52m",
    rating: 4.5,
    thumbnail:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    poster:
      "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=900&q=80",
    tags: ["Lãng mạn", "Drama"],
    moods: ["Lãng mạn"],
    cast: ["Haruka Abe", "Kei Tanaka", "Lucy Liu"],
    director: "Naomi Kurosawa",
  },
  {
    id: "parallel-laughter",
    slug: "parallel-laughter",
    title: "Parallel Laughter",
    synopsis:
      "Nhà khoa học kỳ quặc thử mở timeline vui vẻ nhất nhưng vô tình nhân bản chính mình.",
    year: 2022,
    duration: "1h 37m",
    rating: 4.2,
    thumbnail: "/posters/parallel-laughter.jpg",
    poster:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    tags: ["Hài hước", "Giả tưởng"],
    moods: ["Hài hước", "Khoa học viễn tưởng"],
    cast: ["Ryan Reynolds", "Awkwafina", "John Boyega"],
    director: "Dax Shepherd",
  },
];

export const aiPlaylists: Playlist[] = [
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

export const moods = [
  "Hành động",
  "Lãng mạn",
  "Kinh dị",
  "Hài hước",
  "Hoạt hình",
  "Khoa học viễn tưởng",
  "Huyền bí",
  "Tài liệu",
];
