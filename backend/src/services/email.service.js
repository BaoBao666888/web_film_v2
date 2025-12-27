import nodemailer from "nodemailer";

function buildTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  // Nếu thiếu config thì không tạo transporter
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

class EmailService {
  async sendResetCode(toEmail, code) {
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    const MAIL_FROM = process.env.MAIL_FROM;

    // Debug nhanh để biết env có vào không
    console.log("[SMTP ENV]", {
      host: SMTP_HOST,
      user: SMTP_USER,
      passLen: (SMTP_PASS || "").length,
    });

    // Dev fallback nếu chưa cấu hình SMTP
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      console.warn("[EMAIL DEV] Reset code for", toEmail, "=>", code);
      return;
    }

    const transporter = buildTransporter();
    if (!transporter) {
      console.warn("[EMAIL DEV] Transporter not ready. Reset code:", code);
      return;
    }

    await transporter.sendMail({
      from: MAIL_FROM || SMTP_USER,
      to: toEmail,
      subject: "Mã xác thực đặt lại mật khẩu - Lumi AI Cinema",
      text:
        `Bạn vừa yêu cầu đặt lại mật khẩu.\n\n` +
        `Mã xác thực: ${code}\n` +
        `Mã có hiệu lực trong 10 phút.\n\n` +
        `Nếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
    });

    console.log("[EMAIL] Sent reset code to", toEmail);
  }
}

export default new EmailService();
