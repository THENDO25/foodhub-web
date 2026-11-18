const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const validator = require("validator");
const db = require("../db");
const { validatePassword } = require("../utils/password-policy");

const router = express.Router();

// Brute-force protection on the two credential-guessing endpoints.
// rate limiting attempts number of login

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later." },
});

// Account lockout: 5 wrong passwords lock that account for 15 minutes. This is
// separate from the per-IP rate limit above, so it also stops a distributed guess.
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

// Compared against when the email does not exist, so a missing account takes about
// as long to answer as a wrong password (avoids a timing hint for account discovery).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-timing-only", 12);

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
    body("name").isString().trim().isLength({ min: 2, max: 100 }).withMessage("Enter your full name."),
    body("email").isString().trim().isEmail().withMessage("Enter a valid email.").normalizeEmail(),
    body("password")
      .isString().withMessage("Enter a password.")
      .custom((value, { req }) => {
        const problem = validatePassword(value, { email: req.body.email, name: req.body.name });
        if (problem) throw new Error(problem);
        return true;
      }),
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

    // Signup stores the normalized email (e.g. dots/+tags removed for Gmail),
    // so try the email as typed first, then its normalized form.
    const normalized = validator.normalizeEmail(email) || email;
    const user =
      db.prepare("SELECT * FROM users WHERE email = ?").get(email) ||
      db.prepare("SELECT * FROM users WHERE email = ?").get(normalized);

    // Same generic error whether the email doesn't exist or the password is
    // wrong — don't let an attacker use this endpoint to enumerate accounts.
    const genericError = { error: "Invalid email or password." };

    if (!user) {
      bcrypt.compareSync(password, DUMMY_HASH);
      return res.status(401).json(genericError);
    }

    let failedBefore = user.failed_logins;
    if (user.locked_until) {
      const remainingMs = new Date(user.locked_until) - new Date();
      if (remainingMs > 0) {
        const minutes = Math.ceil(remainingMs / 60000);
        res.set("Retry-After", String(Math.ceil(remainingMs / 1000)));
        return res.status(423).json({
          error: `Too many failed attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        });
      }
      // The lock has expired: start counting from zero again. Without this reset the
      // stored counter stayed at 5, so the very first typo after a lock re-locked the account.
      failedBefore = 0;
      db.prepare("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?").run(user.id);
    }

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) {
      const failed = failedBefore + 1;
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

    // session-fixation-attacks

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
