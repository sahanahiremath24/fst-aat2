import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    category: {
      type: String,
      required: true,
      enum: ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"]
    },
    date: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
