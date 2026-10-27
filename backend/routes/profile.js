const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// All routes here use req.session.userId (server-side) to know WHICH account
// to read/write — never an id or email taken from the request body/query.
// That's what stops IDOR: a signed-in customer can only ever touch their own
// row. Try passing a different user's id in the body and confirm it's ignored.

router.get("/", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    role: user.role,
  });
});

router.put(
  "/",
  requireAuth,
  [
    body("name").isString().trim().isLength({ min: 2, max: 100 }),
    body("phone").optional({ checkFalsy: true }).isString().trim().isLength({ max: 40 }),
    body("address").optional({ checkFalsy: true }).isString().trim().isLength({ max: 300 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Please check your profile details." });

    const { name, phone = "", address = "" } = req.body;
    db.prepare("UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?").run(
      name,
      phone,
      address,
      req.session.userId
    );
    res.json({ ok: true });
  }
);

router.put(
  "/password",
  requireAuth,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 6, max: 200 }).withMessage("Use at least 6 characters for the new password."),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { currentPassword, newPassword } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Your current password is incorrect." });
    }
    const hash = bcrypt.hashSync(newPassword, 12);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
    res.json({ ok: true });
  }
);

module.exports = router;
