import { Router } from "express";
import mongoose from "mongoose";
import Expense from "../models/Expense.js";
import requireAuth from "../middleware/requireAuth.js";

const router = Router();
const categories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"];

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const expenses = await Expense.find({ owner: req.session.userId }).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { description, amount, category, date } = body;
  const parsedAmount = Number(amount);
  const parsedDate = new Date(date);

  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 100 ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    !categories.includes(category) ||
    !date ||
    Number.isNaN(parsedDate.getTime())
  ) {
    return res.status(400).json({ message: "Enter a description, positive amount, valid category, and valid date." });
  }

  try {
    const expense = await Expense.create({
      owner: req.session.userId,
      description: description.trim(),
      amount: parsedAmount,
      category,
      date: parsedDate
    });
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid expense ID." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { description, amount, category, date } = body;
  const parsedAmount = Number(amount);
  const parsedDate = new Date(date);
  if (
    typeof description !== "string" ||
    !description.trim() ||
    description.trim().length > 100 ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount <= 0 ||
    !categories.includes(category) ||
    !date ||
    Number.isNaN(parsedDate.getTime())
  ) {
    return res.status(400).json({ message: "Enter a description, positive amount, valid category, and valid date." });
  }

  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, owner: req.session.userId },
      { description: description.trim(), amount: parsedAmount, category, date: parsedDate },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: "Expense not found." });
    res.json(expense);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid expense ID." });
  }

  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, owner: req.session.userId });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
