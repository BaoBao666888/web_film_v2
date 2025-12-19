# Backend Architecture - Controller/Service Pattern

## 📁 Cấu trúc thư mục

```
backend/src/
├── controllers/          # HTTP Request/Response handlers
│   ├── admin.controller.js
│   ├── auth.controller.js
│   ├── feedback.controller.js
│   ├── history.controller.js
│   ├── movie.controller.js
│   └── watchParty.controller.js
│
├── services/             # Business logic layer
│   ├── admin.service.js
│   ├── auth.service.js
│   ├── feedback.service.js
│   ├── history.service.js
│   ├── movie.service.js
│   ├── movie.helpers.js      # Movie utilities
│   └── watchParty.service.js
│
├── routes/              # Route definitions (slim)
│   ├── admin.js
│   ├── auth.js
│   ├── feedback.js
│   ├── history.js
│   ├── hls.js
│   ├── movies.js
│   └── watchParty.js
│
├── models/              # Mongoose schemas
├── middleware/          # Authentication, validation, etc.
├── config/              # Configuration files
├── socket/              # Socket.IO handlers
└── utils/               # Helper functions
```

## 🏗️ Kiến trúc 3 lớp

### 1. **Routes Layer** (Routes)

- Định nghĩa endpoints
- Apply middleware (auth, validation)
- Delegate đến Controller
- **Không chứa business logic**

```javascript
// Example: routes/auth.js
router.post(
  "/login",
  asyncHandler((req, res) => authController.login(req, res))
);
```

### 2. **Controller Layer** (Controllers)

- Xử lý HTTP requests/responses
- Validate input từ req.body, req.params, req.query
- Gọi Service methods
- Format responses & handle errors với status codes
- **Không chứa business logic**

```javascript
// Example: controllers/auth.controller.js
async login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
    }
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error) {
    // Error handling...
  }
}
```

### 3. **Service Layer** (Services)

- Chứa toàn bộ business logic
- Orchestrate database operations
- Reusable across Controllers & Socket handlers
- Throw errors với error codes rõ ràng
- **Không biết về HTTP (req/res)**

```javascript
// Example: services/auth.service.js
async login(credentials) {
  const { email, password } = credentials;
  const user = await findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error("INVALID_CREDENTIALS");
  }
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
  return { token, user: this.sanitizeUser(user) };
}
```

## 📊 So sánh trước và sau

### ❌ Trước (Routes chứa mọi thứ)

```javascript
// routes/auth.js - 157 dòng
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });

  const user = await findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: "Sai thông tin đăng nhập" });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { ... } });
});
```

### ✅ Sau (Tách biệt rõ ràng)

```javascript
// routes/auth.js - 33 dòng (giảm 79%)
router.post("/login", asyncHandler((req, res) =>
  authController.login(req, res)
));

// controllers/auth.controller.js
async login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

// services/auth.service.js
async login(credentials) {
  // Business logic here
  return { token, user };
}
```

## 🎯 Lợi ích

### 1. **Separation of Concerns**

- Mỗi layer có trách nhiệm riêng biệt
- Dễ hiểu, dễ maintain
- Giảm coupling giữa các phần

### 2. **Testability**

```javascript
// Service có thể unit test độc lập
describe("AuthService", () => {
  it("should login with valid credentials", async () => {
    const result = await authService.login({ email, password });
    expect(result).toHaveProperty("token");
  });
});
```

### 3. **Reusability**

```javascript
// Service có thể dùng ở nhiều nơi
// REST API Controller
authController.login(req, res);

// Socket.IO Handler
socket.on("login", async (data) => {
  const result = await authService.login(data);
  socket.emit("login-success", result);
});

// CLI Tool
const result = await authService.login({ email, password });
```

### 4. **Maintainability**

- Code organized theo chức năng
- Dễ tìm bugs
- Dễ thêm features mới
- Giảm code duplication

### 5. **Scalability**

- Dễ thêm layer mới (Repository, Cache, etc.)
- Dễ chuyển sang microservices
- Dễ implement design patterns

## 📝 Coding Standards

### Error Handling

```javascript
// Service: Throw error với code rõ ràng
if (!user) throw new Error("USER_NOT_FOUND");

// Controller: Map error code → HTTP status
if (error.message === "USER_NOT_FOUND") {
  return res.status(404).json({ message: "Không tìm thấy người dùng" });
}
```

### Async Handler

```javascript
// Tất cả routes đều dùng asyncHandler
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get(
  "/",
  asyncHandler((req, res) => controller.method(req, res))
);
```

### Singleton Pattern

```javascript
// Services export singleton instance
class AuthService { ... }
export default new AuthService();
```

## 🚀 Migration Guide

### Khi thêm feature mới:

1. **Service**: Viết business logic

```javascript
// services/movie.service.js
async getRecommendations(userId) {
  // Logic here
  return recommendations;
}
```

2. **Controller**: Handle HTTP

```javascript
// controllers/movie.controller.js
async getRecommendations(req, res) {
  const result = await movieService.getRecommendations(req.user.id);
  res.json(result);
}
```

3. **Route**: Define endpoint

```javascript
// routes/movies.js
router.get(
  "/recommendations",
  verifyToken,
  asyncHandler((req, res) => movieController.getRecommendations(req, res))
);
```

## 📈 Kết quả Refactor

| Module     | Routes (dòng)        | Trước | Sau | Giảm |
| ---------- | -------------------- | ----- | --- | ---- |
| WatchParty | routes/watchParty.js | 331   | 75  | 77%  |
| Auth       | routes/auth.js       | 157   | 33  | 79%  |
| Movies     | routes/movies.js     | 477   | 86  | 82%  |
| Admin      | routes/admin.js      | 64    | 27  | 58%  |
| Feedback   | routes/feedback.js   | 71    | 21  | 70%  |
| History    | routes/history.js    | 50    | 30  | 40%  |

**Tổng cộng**: Giảm từ ~1150 dòng xuống ~272 dòng (**-76%**)

## ✅ Checklist

- [x] Auth module
- [x] Movies module
- [x] WatchParty module
- [x] Admin module
- [x] Feedback module
- [x] History module
- [x] No syntax errors
- [x] All routes preserved
- [x] Consistent error handling

## 🔄 Next Steps

1. **Add Unit Tests**: Test services independently
2. **Add Integration Tests**: Test API endpoints
3. **Add Repository Layer**: Separate DB queries from services
4. **Add Caching**: Redis for frequently accessed data
5. **Add Logging**: Winston/Pino for structured logging
6. **Add Validation**: Joi/Zod for input validation
7. **Add Documentation**: Swagger/OpenAPI specs
