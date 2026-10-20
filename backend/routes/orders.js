
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

// Customer: create an order using trusted database product details.
router.post(
  "/",
  requireAuth,
  [
    body("address")
      .isString()
      .withMessage("Address must be text.")
      .bail()
      .trim()
      .isLength({ min: 3, max: 300 })
      .withMessage("Address must be between 3 and 300 characters."),

    body("items")
      .isArray({ min: 1 })
      .withMessage("Your cart is empty."),

    body("paymentMethod")
      .isIn(["card", "cod"])
      .withMessage("Invalid payment method."),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: errors.array()[0].msg,
      });
    }

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(req.session.userId);

    if (!user) {
      return res.status(401).json({
        error: "User account not found. Please log in again.",
      });
    }

    const { address, items, paymentMethod } = req.body;
    const priced = [];
    let total = 0;

    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return res.status(400).json({
          error: "Invalid product details.",
        });
      }

      const name =
        typeof raw.name === "string" ? raw.name.trim() : "";

      if (!name) {
        return res.status(400).json({
          error: "Each product must have a name.",
        });
      }

      // Require a whole-number quantity between 1 and 50.
      const quantity = Number(raw.quantity);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 50
      ) {
        return res.status(400).json({
          error: `Invalid quantity for product: ${name}`,
        });
      }

      // Find the product in the trusted server-side catalogue.
      const product = db
        .prepare(
          "SELECT * FROM products WHERE name = ? OR cart_name = ?"
        )
        .get(name, name);

      // Never accept a price or image for an unknown product from the client.
      if (!product) {
        return res.status(400).json({
          error: `Product not found: ${name}`,
        });
      }

      const price = Number(product.price);

      // Reject invalid prices stored in the database.
      if (!Number.isFinite(price) || price < 0) {
        console.error("Invalid database price for product:", product.name);

        return res.status(500).json({
          error: "Unable to process this product's price.",
        });
      }

      const lineTotal = price * quantity;

      if (!Number.isSafeInteger(Math.round(lineTotal * 100))) {
        return res.status(400).json({
          error: `Invalid order amount for product: ${name}`,
        });
      }

      total += lineTotal;

      priced.push({
        name: product.name,
        price,
        quantity,
        image: product.image || "",
      });
    }

    // Ensure the final order total is a valid, non-negative number.
    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({
        error: "Invalid order total.",
      });
    }

    const orderId = `FH-${Date.now().toString().slice(-8)}`;

    try {
      db.prepare(`
        INSERT INTO orders (
          id,
          user_id,
          customer_name,
          email,
          address,
          items_json,
          total,
          status,
          payment_method
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
      `).run(
        orderId,
        user.id,
        user.name,
        user.email,
        address.trim(),
        JSON.stringify(priced),
        total,
        paymentMethod
      );

      // Save the customer's updated address only after the order is created.
      db.prepare(
        "UPDATE users SET address = ? WHERE id = ?"
      ).run(address.trim(), user.id);

      const order = db
        .prepare("SELECT * FROM orders WHERE id = ?")
        .get(orderId);

      if (!order) {
        console.error("Created order could not be retrieved:", orderId);

        return res.status(500).json({
          error: "Order was created but could not be retrieved.",
        });
      }

      return res.status(201).json({
        order: toApi(order),
      });
    } catch (error) {
      console.error("Failed to create order:", error);

      return res.status(500).json({
        error: "Unable to create your order. Please try again.",
      });
    }
  }
);

// Customer: return only orders belonging to the signed-in user.
router.get("/mine", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(req.session.userId);

  return res.json({
    orders: rows.map(toApi),
  });
});

// Admin: return all orders.
router.get("/", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM orders ORDER BY created_at DESC")
    .all();

  return res.json({
    orders: rows.map(toApi),
  });
});

// Admin: update an order's status.
router.put(
  "/:id/status",
  requireAdmin,
  [
    body("status").isIn([
      "Pending",
      "Preparing",
      "Ready",
      "Delivered",
      "Cancelled",
    ]),
  ],
  (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Invalid status.",
      });
    }

    const info = db
      .prepare("UPDATE orders SET status = ? WHERE id = ?")
      .run(req.body.status, req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    return res.json({
      ok: true,
    });
  }
);

module.exports = router;
