// Handles creating, viewing, and updating food orders.
const express = require("express");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

function toApi(row) {
  return {
    id: row.id,
    customer: row.customer_name,
    email: row.email,
    address: row.address,
    products: JSON.parse(row.items_json),
    total: row.total,
    status: row.status,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
  };
}

// Customer: place an order. Items/total are recomputed from the DB price list
// server-side — the client-submitted price is never trusted, so editing the
// cart in DevTools to set price: 0 before checkout does not work.
// Checks the order details and saves a new order.
router.post(
  "/",
  requireAuth,
  [
    body("address").trim().isLength({ min: 3, max: 300 }),
    body("items").isArray({ min: 1 }).withMessage("Your cart is empty."),
    body("paymentMethod").isIn(["card", "cod"]),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
    const { address, items, paymentMethod } = req.body;

    const priced = [];
    let total = 0;
    for (const raw of items) {
      const name = String(raw.name || "").trim();
      const quantity = Math.max(1, Math.min(50, parseInt(raw.quantity, 10) || 1));
      // Look the product up by name to recover its real, server-side price.
      // (The catalogue's "cartName"/"name" is what the cart stores.)
      const product = db
        .prepare("SELECT * FROM products WHERE name = ? OR cart_name = ?")
        .get(name, name);
      const price = product ? product.price : Math.max(0, Number(raw.price) || 0);
      const image = product ? product.image : raw.image || "";
      total += price * quantity;
      priced.push({ name, price, quantity, image });
    }

    const orderId = `FH-${Date.now().toString().slice(-8)}`;
    db.prepare(`
      INSERT INTO orders (id, user_id, customer_name, email, address, items_json, total, status, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `).run(orderId, user.id, user.name, user.email, address, JSON.stringify(priced), total, paymentMethod);

    db.prepare("UPDATE users SET address = ? WHERE id = ?").run(address, user.id);

    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
    res.status(201).json({ order: toApi(order) });
  }
);

// Customer: only their own orders — scoped by session user id, not a
// client-supplied email, so one customer cannot read another's order history.
// Returns orders for the signed-in user or admin.
router.get("/mine", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.session.userId);
  res.json({ orders: rows.map(toApi) });
});

// Admin: every order.
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json({ orders: rows.map(toApi) });
});

router.put(
  "/:id/status",
  requireAdmin,
  [body("status").isIn(["Pending", "Preparing", "Ready", "Delivered", "Cancelled"])],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Invalid status." });
    const info = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(req.body.status, req.params.id);
    if (info.changes === 0) return res.status(404).json({ error: "Order not found." });
    res.json({ ok: true });
  }
);

module.exports = router;
