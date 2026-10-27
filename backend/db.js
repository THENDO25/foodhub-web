// db.js — SQLite schema + seeding.
require("dotenv").config();
// Every query in this project uses parameterized statements (via better-sqlite3's
// `?` placeholders) specifically so string concatenation / SQL injection is not
// possible from user input. Keep that pattern when you add new queries.

const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "foodhub.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  failed_logins INTEGER NOT NULL DEFAULT 0,
  locked_until  TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  cart_name   TEXT NOT NULL,
  category    TEXT NOT NULL,
  price       REAL NOT NULL CHECK(price >= 0),
  available   INTEGER NOT NULL DEFAULT 1,
  image       TEXT DEFAULT '',
  description TEXT DEFAULT '',
  details     TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  email          TEXT NOT NULL,
  address        TEXT NOT NULL,
  items_json     TEXT NOT NULL,
  total          REAL NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Pending',
  payment_method TEXT NOT NULL DEFAULT 'cod',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  text       TEXT NOT NULL,
  rating     INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
`);

// --- Seed products (idempotent) -------------------------------------------------
function seedProducts() {
  const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  if (count > 0) return;
  const seedPath = path.join(__dirname, "data", "products-seed.json");
  if (!fs.existsSync(seedPath)) return;
  const products = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
  const insert = db.prepare(`
    INSERT INTO products (id, name, cart_name, category, price, available, image, description, details)
    VALUES (@id, @name, @cartName, @category, @price, @available, @image, @description, @details)
  `);
  const insertMany = db.transaction((rows) => {
    for (const p of rows) {
      insert.run({
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
    }
  });
  insertMany(products);
  console.log(`Seeded ${products.length} products.`);
}

// --- Seed admin account (idempotent) --------------------------------------------
function seedAdmin() {
  // A known placeholder/default password must never be accepted in production.
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" &&
      (!configuredPassword || configuredPassword === "admin123" || configuredPassword.startsWith("CHANGE_ME"))) {
    console.error("FATAL: Set a unique ADMIN_PASSWORD in backend/.env before production use.");
    process.exit(1);
  }
  // Use the configured email for both the existence check and insert.
  const email = (process.env.ADMIN_EMAIL || "admin@foodhub.com").trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return;
  // The local-only fallback keeps a fresh demo easy to start; never deploy it.
  const password = configuredPassword || "admin123";
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
  `).run("FoodHub Admin", email, hash);
  console.log(`Seeded admin account: ${email}`);
}

seedProducts();
seedAdmin();

if (require.main === module && process.argv.includes("--seed-only")) {
  console.log("Seed complete.");
  process.exit(0);
}

module.exports = db;
