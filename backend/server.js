// Starts the FoodHub server and connects the website to its API.
require("dotenv").config();
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");

require("./db"); // creates tables + seeds products/admin on boot

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";

// Session secret: require one in production, generate a throwaway one in dev
// so the app still boots, but print a loud warning so it's never missed.
let SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (IS_PROD) {
    console.error("FATAL: SESSION_SECRET must be set in production. See .env.example.");
    process.exit(1);
  }
  SESSION_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn("WARNING: SESSION_SECRET not set — using a random dev-only secret (sessions reset on restart).");
}

app.set("trust proxy", 1);

// Security headers. CSP is intentionally not locked all the way down because
// the existing frontend loads EmailJS from a CDN and uses inline <script>
// blocks — see SECURITY-TESTING.md for how to tighten this further as an
// exercise (move inline scripts to files, add a nonce, drop 'unsafe-inline').
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.emailjs.com"],
      },
    },
  })
);

app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  session({
    name: "foodhub.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: IS_PROD, // requires HTTPS in production
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
    // NOTE: this uses express-session's in-memory store, which is fine for
    // local use / a single test instance but is lost on restart and won't
    // scale to multiple processes. Swap in connect-sqlite3 or connect-redis
    // if you need persistent/shared sessions.
  })
);

// --- API ------------------------------------------------------------------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/products", require("./routes/products"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/admin/customers", require("./routes/customers"));

// --- Static frontend --------------------------------------------------------
// Serves the existing foodhub-web site (one directory up from /backend) so
// the whole app runs from a single origin/port — no CORS needed in normal use.
const FRONTEND_DIR = path.join(__dirname, "..");
app.use(express.static(FRONTEND_DIR));

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found." });
  next();
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`FoodHub server running at http://localhost:${PORT}`);
});
