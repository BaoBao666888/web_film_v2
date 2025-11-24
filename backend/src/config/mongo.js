import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lumi_ai";

  try {
    await mongoose.connect(uri, {});
    console.log("✅ Đã kết nối MongoDB:", uri);
  } catch (err) {
    console.error("❌ Lỗi kết nối MongoDB:", err.message);
    process.exit(1);
  }
};
