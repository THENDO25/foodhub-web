// Lets admins view customer details.
const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Admin-only. Deliberately never returns password_hash.
router.get("/", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT id, name, email, phone, address, created_at FROM users WHERE role = 'customer' ORDER BY name")
    .all();
  res.json({
    customers: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      createdAt: r.created_at,
    })),
  });
});

router.put("/:id", requireAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'customer'").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Customer not found." });
  const { name, phone = "", address = "" } = req.body;
  db.prepare("UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?").run(
    String(name || target.name).trim(),
    String(phone).trim(),
    String(address).trim(),
    target.id
  );
  res.json({ ok: true });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const target = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'customer'").get(req.params.id);
  if (!target) return res.status(404).json({ error: "Customer not found." });
  // Orders keep their customer_name/email snapshot (user_id is ON DELETE SET NULL),
  // so historical orders aren't lost when the account is removed.
  db.prepare("DELETE FROM users WHERE id = ?").run(target.id);
  res.json({ ok: true });
});

module.exports = router;
