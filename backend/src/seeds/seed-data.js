import { getDefaultHlsHeaders } from "../config/hlsDefaults.js";

export const seedMovies = [
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
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    videoType: "hls",
    videoHeaders: getDefaultHlsHeaders(),
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
    videoUrl: "https://test-streams.mux.dev/low-latency/index.m3u8",
    videoType: "hls",
    videoHeaders: getDefaultHlsHeaders(),
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
      "https://lh3.googleusercontent.com/pw/AP1GczPun242vmKuOphKEcCYpbkLH14tzc3six1GjNfdJGT1M3EoY74STgJ9tv9H44Ii7w5in5RHm6HpMIuTwoIsehniqNBrPGr_BrI_9rV4483ZsSnND43aR5AVkve03SqEpuBXqadcQcdqVtrcvrkd1T4=w948-h948-s-no-gm?authuser=0",
    poster:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    trailerUrl: "https://www.youtube.com/watch?v=kXYiU_JCYtU",
    videoUrl: "https://test-streams.mux.dev/dai-discontinuity/dai.m3u8",
    videoType: "hls",
    videoHeaders: getDefaultHlsHeaders(),
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
    videoUrl: "https://bitdash-a.akamaihd.net/content/MI201109210084_1/playlist.m3u8",
    videoType: "hls",
    videoHeaders: getDefaultHlsHeaders(),
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
    videoUrl: "https://test-streams.mux.dev/pts_switching/master.m3u8",
    videoType: "hls",
    videoHeaders: getDefaultHlsHeaders(),
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
    videoUrl: "https://test-streams.mux.dev/bbb-360p.m3u8",
    videoType: "hls",
    videoHeaders: getDefaultHlsHeaders(),
    tags: ["Reality", "Cooking", "Sci-fi"],
    moods: ["Hài hước", "Hoạt hình"],
    cast: ["Padma Lakshmi", "Simu Liu"],
    director: "Jon Favreau",
  },
];

export const seedUsers = [
  {
    id: "demo-user",
    name: "Minh Anh",
    email: "minhanh@example.com",
    avatar:
      "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=200&q=80",
    role: "user",
    password: "123456",
    favorite_moods: ["Hành động", "Khoa học viễn tưởng"],
  },
  {
    id: "admin-user",
    name: "Admin Lumi",
    email: "admin@lumi.ai",
    avatar:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
    role: "admin",
    password: "admin123",
    favorite_moods: ["Huyền bí", "Tài liệu"],
  },
];
