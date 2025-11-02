import { Route, Routes } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { MovieDetailPage } from "./pages/MovieDetailPage";
import { RecommendPage } from "./pages/RecommendPage";
import { ChatPage } from "./pages/ChatPage";
import { RatingPage } from "./pages/RatingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LogoutPage } from "./pages/LogoutPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminAddMoviePage } from "./pages/admin/AdminAddMoviePage";
import { AdminManagePage } from "./pages/admin/AdminManagePage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminStatsPage } from "./pages/admin/AdminStatsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="movie/:id" element={<MovieDetailPage />} />
        <Route path="recommend" element={<RecommendPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="rating" element={<RatingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="logout" element={<LogoutPage />} />

        <Route path="admin">
          <Route index element={<AdminDashboardPage />} />
          <Route path="add-movie" element={<AdminAddMoviePage />} />
          <Route path="manage" element={<AdminManagePage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="stats" element={<AdminStatsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
