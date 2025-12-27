import { Route, Routes, Navigate, Outlet } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { MovieDetailPage } from "./pages/MovieDetailPage";
import { RecommendPage } from "./pages/RecommendPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LogoutPage } from "./pages/LogoutPage";
import { WatchPage } from "./pages/WatchPage";
import { InboxPage } from "./pages/InboxPage";
import { HistoryPage } from "./pages/HistoryPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminAddMoviePage } from "./pages/admin/AdminAddMoviePage";
import { AdminManagePage } from "./pages/admin/AdminManagePage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminStatsPage } from "./pages/admin/AdminStatsPage";
import { useAuth } from "./hooks/useAuth";
import { TrendingPage } from "./pages/TrendingPage";
import { WatchPartyCreatePage } from "./pages/WatchPartyCreatePage";
import { WatchPartyListPage } from "./pages/WatchPartyListPage";
import { WatchPartyRoomPage } from "./pages/WatchPartyRoomPage";
import { TopupPage } from "./pages/TopupPage";

function AdminGuard() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-300">
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="trending" element={<TrendingPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="movie/:id" element={<MovieDetailPage />} />
        <Route path="recommend" element={<RecommendPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="topup" element={<TopupPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="logout" element={<LogoutPage />} />
        <Route path="watch/:id" element={<WatchPage />} />
        <Route path="watch-party">
          <Route index element={<WatchPartyListPage />} />
          <Route path="create" element={<WatchPartyCreatePage />} />
          <Route path="room/:roomId" element={<WatchPartyRoomPage />} />
        </Route>

        <Route path="admin" element={<AdminGuard />}>
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
