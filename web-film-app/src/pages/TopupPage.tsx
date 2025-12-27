import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";

const BANK_INFO = {
  bankName: "MB Bank",
  accountNumber: "1234567890",
  accountName: "LUMI AI CINEMA",
};

const MOMO_INFO = {
  phone: "0900 000 000",
  name: "LUMI AI CINEMA",
};

const formatVnd = (value?: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value ?? 0)} VNĐ`;

export function TopupPage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState(100000);

  const transferNote = useMemo(() => {
    if (user?.id) {
      return `NAPTIEN ${user.id}`;
    }
    return "Vui lòng đăng nhập để lấy mã nạp";
  }, [user?.id]);

  const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Nạp tiền"
        description="Chuyển khoản theo hướng dẫn. Admin sẽ đối chiếu thủ công và cộng tiền."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">MoMo QR</p>
              <p className="text-xs text-slate-400">
                Quét mã để chuyển khoản nhanh (mã minh họa).
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-dark/60 px-4 py-2 text-xs text-slate-200">
              Số dư: {formatVnd(user?.balance)}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-dark/70 p-4">
              <img
                src="/momo.jpg"
                alt="MoMo QR"
                className="h-56 w-56 rounded-xl bg-white p-2"
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-400">
                  Số tiền cần nạp (VNĐ)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-dark/70 px-4 py-3 text-sm text-white outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Tổng cần chuyển: {formatVnd(normalizedAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-dark/60 p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Nội dung chuyển khoản
                </p>
                <p className="mt-2 font-semibold text-white">{transferNote}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Vui lòng ghi đúng nội dung để admin đối chiếu nhanh hơn.
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-white/20 bg-dark/60 p-4 text-xs text-slate-300">
                Mã QR hiện là minh họa.
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/25">
          <div>
            <p className="text-sm font-semibold text-white">Thông tin MoMo</p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>
                Số điện thoại:{" "}
                <span className="text-white">{MOMO_INFO.phone}</span>
              </p>
              <p>
                Chủ tài khoản:{" "}
                <span className="text-white">{MOMO_INFO.name}</span>
              </p>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="text-sm font-semibold text-white">
              Thông tin chuyển khoản ngân hàng
            </p>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p>
                Ngân hàng:{" "}
                <span className="text-white">{BANK_INFO.bankName}</span>
              </p>
              <p>
                Số tài khoản:{" "}
                <span className="text-white">{BANK_INFO.accountNumber}</span>
              </p>
              <p>
                Chủ tài khoản:{" "}
                <span className="text-white">{BANK_INFO.accountName}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-dark/60 p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">Lưu ý</p>
            <p className="mt-2">
              Sau khi chuyển khoản, admin sẽ đối chiếu thủ công và cộng tiền vào
              tài khoản. Thời gian xử lý: 5-30 phút trong giờ hành chính.
            </p>
            <p className="mt-2 text-amber-200">
              Hệ thống chưa hỗ trợ rút tiền về. Khi nạp tiền nghĩa là bạn chấp
              nhận điều khoản này.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
