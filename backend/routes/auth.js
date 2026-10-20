const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const db = require("../db");

const router = express.Router();

// Brute-force protection on the two credential-guessing endpoints.
// rate limiting 
// you should get HTTP 429 after a handful of attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    role: row.role,
    createdAt: row.created_at,
  };
}

router.post(
  "/signup",
  authLimiter,
  [
    body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Enter your full name."),
    body("email").trim().isEmail().withMessage("Enter a valid email.").normalizeEmail(),
    body("password").isLength({ min: 6, max: 200 }).withMessage("Password must be at least 6 characters."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { name, password } = req.body;
    const email = req.body.email.toLowerCase();

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Never store plaintext passwords — bcrypt with a strong cost factor.
    const hash = bcrypt.hashSync(password, 12);
    const info = db
      .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'customer')")
      .run(name, email, hash);

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Could not start session." });
      req.session.userId = user.id;
      req.session.role = user.role;
      res.status(201).json({ user: publicUser(user) });
    });
  }
);

router.post(
  "/login",
  authLimiter,
  [body("email").trim().notEmpty(), body("password").notEmpty()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

    // Same generic error whether the email doesn't exist or the password is
    // wrong 
    const genericError = { error: "Invalid email or password." };

    if (!user) return res.status(401).json(genericError);

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({ error: "Account temporarily locked. Try again later." });
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      const failed = user.failed_logins + 1;
      let lockedUntil = null;
      if (failed >= MAX_FAILED_LOGINS) {
        lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
      }
      db.prepare("UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?").run(
        failed,
        lockedUntil,
        user.id
      );
      return res.status(401).json(genericError);
    }

    db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(user.id);

    // Regenerate the session on login 
    // Create a new session ID after login to prevent session fixation attacks.
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: "Could not start session." });
      req.session.userId = user.id;
      req.session.role = user.role;
      res.json({ user: publicUser(user) });
    });
  }
);

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("foodhub.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ user: null });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!user) return res.json({ user: null });
  res.json({ user: publicUser(user) });
});

module.exports = router;
