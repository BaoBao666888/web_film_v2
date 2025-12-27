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
    balance: 500000,
    favorite_moods: ["Huyền bí", "Tài liệu"],
  },
];
