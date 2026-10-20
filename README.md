# FoodHub

## Run it

```bash
cd backend
npm install
cp .env.example .env        # then edit SESSION_SECRET etc. if you want
npm start
```

Open **http://localhost:3000** — the server serves the whole site itself
(no separate frontend server, no CORS to configure).

The database (`backend/data/foodhub.db`, SQLite) and the product catalogue
are created and seeded automatically on first run. A default admin account
is also seeded:

- **Admin**: `admin@foodhub.com` / `admin123` (change via `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` in `.env`)
- Customers sign up normally through the site.

To start over with a clean database, stop the server and delete
`backend/data/foodhub.db*`, then run `npm start` again.

## What changed from the original prototype

The original site kept *everything* — accounts, passwords (in plain text),
orders, products, reviews, even the signed-in role — in `localStorage`.


All of that now lives in `backend/`, backed by SQLite, with:

- bcrypt password hashing
- httpOnly session cookies (JS on the page can't read or forge them)
- every admin/customer-only route re-checked **on the server**, not just
  hidden in the UI
- order totals recalculated server-side from the product table
- rate limiting + account lockout on login
- parameterized SQL everywhere (no string-built queries)
