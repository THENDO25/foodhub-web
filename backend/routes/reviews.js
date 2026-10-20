// Handles customer reviews and ratings.
const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const db = require("../db");

const router = express.Router();

const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reviews submitted. Slow down." },
});

function toApi(row) {
  return { id: row.id, name: row.name, text: row.text, rating: row.rating, createdAt: row.created_at };
}

// Returns the reviews saved in the database.
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM reviews ORDER BY created_at DESC").all();
  res.json({ reviews: rows.map(toApi) });
});

// Anonymous guests may post a review (matching the original site's behaviour),
// but it's rate-limited and the text is stored as-is and MUST be HTML-escaped
// by the frontend at render time — never inserted as raw innerHTML. That's
// the stored-XSS angle worth testing: try submitting a review containing
// "<script>" or an <img onerror=...> tag and confirm it renders as plain text.
// Checks and saves a new customer review.
router.post(
  "/",
  reviewLimiter,
  [body("text").trim().isLength({ min: 1, max: 1000 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Review text is required." });

    let name = "Guest";
    if (req.session && req.session.userId) {
      const user = db.prepare("SELECT name FROM users WHERE id = ?").get(req.session.userId);
      if (user) name = user.name;
    } else if (req.body.name) {
      name = String(req.body.name).trim().slice(0, 100) || "Guest";
    }

    const id = "RV-" + Date.now();
    db.prepare("INSERT INTO reviews (id, user_id, name, text, rating) VALUES (?, ?, ?, ?, ?)").run(
      id,
      req.session && req.session.userId ? req.session.userId : null,
      name,
      req.body.text,
      req.body.rating ? Number(req.body.rating) : null
    );
    const row = db.prepare("SELECT * FROM reviews WHERE id = ?").get(id);
    res.status(201).json({ review: toApi(row) });
  }
);

module.exports = router;
