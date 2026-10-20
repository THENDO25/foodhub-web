// Handles reading and managing menu products.
const express = require("express");
const { body, validationResult } = require("express-validator");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    cartName: row.cart_name,
    category: row.category,
    price: row.price,
    available: !!row.available,
    image: row.image,
    description: row.description,
    details: row.details,
  };
}

// Public: anyone can browse the menu.
// Returns the menu products for the website.
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY category, name").all();
  res.json({ products: rows.map(toApi) });
});

// Everything below is admin-only, enforced server-side.
// Adds a new product for an admin.
router.post(
  "/",
  requireAdmin,
  [
    body("id").trim().matches(/^[a-z0-9-]{2,60}$/i).withMessage("id must be alphanumeric/hyphen."),
    body("name").trim().isLength({ min: 1, max: 120 }),
    body("category").trim().isLength({ min: 1, max: 60 }),
    body("price").isFloat({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const p = req.body;
    try {
      db.prepare(`
        INSERT INTO products (id, name, cart_name, category, price, available, image, description, details)
        VALUES (@id, @name, @cartName, @category, @price, @available, @image, @description, @details)
      `).run({
        id: p.id,
        name: p.name,
        cartName: p.cartName || p.name,
        category: p.category,
        price: p.price,
        available: p.available === false ? 0 : 1,
        image: p.image || "",
        description: p.description || "",
        details: p.details || "",
      });
    } catch (e) {
      return res.status(409).json({ error: "A product with that id already exists." });
    }
    res.status(201).json({ ok: true });
  }
);

// Updates an existing product.
router.put("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Product not found." });

  const p = { ...existing, ...req.body };
  db.prepare(`
    UPDATE products SET name=?, cart_name=?, category=?, price=?, available=?, image=?, description=?, details=?
    WHERE id=?
  `).run(
    p.name,
    p.cartName || p.cart_name,
    p.category,
    Number(p.price),
    p.available === false ? 0 : p.available === true ? 1 : existing.available,
    p.image,
    p.description,
    p.details,
    req.params.id
  );
  res.json({ ok: true });
});

// Deletes a product from the menu.
router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
