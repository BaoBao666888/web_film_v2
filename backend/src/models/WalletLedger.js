import mongoose from "mongoose";

const WalletLedgerSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true },
  user_id: { type: String, index: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ["topup", "purchase", "admin_adjust", "reversal", "refund"],
    default: "admin_adjust",
  },
  ref_id: String,
  note: String,
  created_by: String,
  created_at: { type: Date, default: Date.now },
});

export const WalletLedger = mongoose.model("WalletLedger", WalletLedgerSchema);
