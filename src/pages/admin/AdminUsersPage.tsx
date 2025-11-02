import { PageHeader } from "../../components/PageHeader";

const users = [
  {
    name: "Minh Anh",
    email: "minhanh@example.com",
    role: "User",
    status: "Hoạt động",
    joined: "12/08/2024",
  },
  {
    name: "Trung Kiên",
    email: "kien.trung@example.com",
    role: "Admin",
    status: "Hoạt động",
    joined: "05/03/2023",
  },
  {
    name: "Ngọc Hân",
    email: "han.ngoc@example.com",
    role: "User",
    status: "Tạm khoá",
    joined: "29/06/2024",
  },
];

export function AdminUsersPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Quản lý người dùng"
        description="Giám sát tài khoản và phân quyền. Dữ liệu bên dưới là demo để trình bày UI."
      />

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <input
              placeholder="Tìm theo tên, email..."
              className="w-72 rounded-full border border-white/10 bg-dark/60 px-4 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary">
              Tìm
            </button>
          </div>
          <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white hover:border-primary hover:text-primary">
            Xuất CSV
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm text-slate-200">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-6 py-4">Tên</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Vai trò</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Ngày tham gia</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.email}
                  className="border-t border-white/10 transition hover:bg-white/5"
                >
                  <td className="px-6 py-4 text-sm text-white">{user.name}</td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {user.role}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-300">
                    {user.status}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {user.joined}
                  </td>
                  <td className="px-6 py-4 text-right text-xs">
                    <button className="mr-2 rounded-full border border-white/20 px-3 py-1 text-slate-200 hover:border-primary hover:text-primary">
                      Đổi quyền
                    </button>
                    <button className="rounded-full border border-red-400/40 px-3 py-1 text-red-300 hover:bg-red-500/10">
                      Khoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          Ghi chú: Sẽ gọi API `/admin/users` để lấy danh sách thực tế. Nút khoá
          sẽ mở modal xác nhận trước khi gửi yêu cầu cập nhật trạng thái.
        </p>
      </div>
    </div>
  );
}
