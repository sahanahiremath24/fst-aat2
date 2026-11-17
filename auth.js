import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user._id.toString(), email: user.email };
}

function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId.toString();
      req.session.save((saveError) => (saveError ? reject(saveError) : resolve()));
    });
  });
}

router.post("/register", async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!emailPattern.test(email) || email.length > 254) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Your password must be between 8 and 72 characters." });
  }

  try {
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12) });
    await startSession(req, user._id);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with that email already exists. Try signing in." });
    }
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!emailPattern.test(email) || !password || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "Enter your email and password." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    await startSession(req, user._id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Sign in to continue." });
  }
  try {
    const user = await User.findById(req.session.userId).select("email");
    if (!user) {
      return req.session.destroy((error) => {
        if (error) return next(error);
        res.status(401).json({ message: "Your session has expired. Sign in again." });
      });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("spendwise.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    res.status(204).end();
  });
});

export default router;
