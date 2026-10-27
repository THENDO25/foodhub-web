# FoodHub — Cybersecurity Elective Project

FoodHub is a food-ordering website and REST API backed by SQLite. This version includes security-focused changes, a repeatable API regression test, a finding-by-finding review, and a practical manual retest guide.

## Requirements

- Node.js 20 or newer (Node 22 LTS is a good local choice)
- npm
- Linux, macOS, or Windows

## Run the application

1. Extract the project ZIP.
2. Open a terminal in the extracted `foodhub-web` folder.
3. Install backend dependencies and create your local environment file:

   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

4. Edit `backend/.env`. For a local demonstration, you can leave `NODE_ENV=development`. Set a unique admin password and a random session secret, for example:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Copy the generated value into `SESSION_SECRET`.

5. Start the server:

   ```bash
   npm start
   ```

6. Open **http://localhost:3000**. Use this same origin for every page. Do not open HTML files directly or use `python3 -m http.server`; login, sessions, orders, and the API require the Node server.

The app creates its SQLite database and seeds the product catalogue on first start. The database is intentionally not included in the ZIP, so the package does not contain a prior user's accounts, orders, reviews, or other local data.

### Local demo admin

If you do not create a `.env` file, the development-only fallback is `admin@foodhub.com` / `admin123`. Change it before sharing the app. If you copied `.env.example`, the configured `ADMIN_PASSWORD` is a placeholder and must be replaced with your own password before use. Production mode refuses the placeholder/default admin password and requires a `SESSION_SECRET`.

## Run the security regression test

In a second terminal:

```bash
cd foodhub-web/backend
npm test
```

The test creates a temporary database and test admin account; it does not use the normal FoodHub database. It checks:

- security headers and public product catalogue
- anonymous and customer access restrictions on protected APIs
- HttpOnly/SameSite session cookies and password hashing
- rejection of untrusted cross-origin mutation requests
- server-side order price calculation and quantity validation
- stored review payload persistence and review validation
- admin-only product/customer/order access
- prevention of static access to backend source and SQLite files
- regression guards against known unsafe HTML render sinks in cart, favourites, and reviews

## Project structure

- `home/`, `menu/`, `cart/`, `manage-account/`, `reviews/` — website pages and frontend behavior
- `shared/` — API client, session state, and product catalogue helpers
- `admin/` — admin dashboard for orders, customers, products, and reviews
- `backend/server.js` — Express server, security headers, CORS and origin checks, sessions, and static-file restrictions
- `backend/routes/` — authentication, profile, products, orders, customers, and reviews APIs
- `backend/db.js` — SQLite schema, seed products, and local admin account
- `tests/security.test.js` — repeatable API security/regression test
- `SECURITY-REVIEW.md` — findings, risks, mitigations, limitations, and retest evidence
- `SECURITY-TESTING.md` — hands-on verification guide
- `PROJECT-WALKTHROUGH.md` — presentation/story/scenario for the elective

## Security notes

- Customer passwords are hashed with bcrypt; the browser does not store passwords or role flags in localStorage.
- Session cookies are HttpOnly and SameSite=Lax. Server middleware enforces customer/admin access.
- Order totals are calculated from trusted product records on the server, not client-provided prices.
- Cart, favourites, and review user text is rendered using DOM APIs/text nodes or escaped output.
- The CSP has been improved but retains `'unsafe-inline'` to preserve legacy inline scripts and event handlers. See the review for the next hardening step.
- EmailJS is a browser integration. Its public key is not a password, but restrict allowed origins and templates in the EmailJS dashboard before deployment.
- The cart's card payment option is demo-only. This project does not process card payments and should not collect card numbers or CVV values.
- The Express in-memory session store is for local learning only; use a persistent session store and HTTPS for a deployed system.

## Evidence discipline

Do not claim the entire application is secure because one test passed. Record the actual date, browser, command, result, and screenshot for each manual retest. The security report distinguishes automated checks from manual browser checks and remaining limitations.
