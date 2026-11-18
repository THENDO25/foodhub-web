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
// Set FORCE_HTTPS=true once a TLS reverse proxy (Caddy/nginx/ALB) fronts the app.
const FORCE_HTTPS = process.env.FORCE_HTTPS === "true" || process.env.COOKIE_SECURE === "true";

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

if (IS_PROD && /^(SESSION_SECRET|CHANGE_ME)/.test(SESSION_SECRET)) {
  console.error("FATAL: SESSION_SECRET is still a placeholder. Generate one with: openssl rand -hex 32");
  process.exit(1);
}

// Trust a single reverse proxy only in production deployments. Keep local
// development independent of client-supplied X-Forwarded-* headers.
app.set("trust proxy", IS_PROD ? 1 : false);

// Security headers. CSP is intentionally not locked all the way down because
// the existing frontend loads EmailJS from a CDN and uses inline <script>
// blocks — see SECURITY-TESTING.md for how to tighten this further as an
// exercise (move inline scripts to files, add a nonce, drop 'unsafe-inline').
app.use(
  helmet({
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.emailjs.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        // Helmet adds upgrade-insecure-requests by default. Over plain HTTP on a real
        // host (e.g. http://<server-ip>:3000) the browser then rewrites every script,
        // CSS and API request to https:// and the site fails to load. Only send it
        // when HTTPS is really in front of the app.
        upgradeInsecureRequests: FORCE_HTTPS ? [] : null,
      },
    },
  })
);

// Restrict cross-origin requests to explicitly trusted origins.
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests and non-browser clients may omit Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Do not grant CORS access to untrusted origins.
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Reject cross-site browser mutations unless the Origin is same-origin or is
// explicitly configured for the API. SameSite cookies and CORS are additional
// layers; neither is treated as the only CSRF defence.
app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || !req.path.startsWith("/api/")) return next();
  const origin = req.get("origin");
  if (!origin) return next(); // non-browser clients may omit Origin
  let originUrl;
  try { originUrl = new URL(origin); } catch (_) { return res.status(403).json({ error: "Untrusted request origin." }); }
  // Behind a reverse proxy the Host header is often rewritten to the upstream
  // (127.0.0.1:3000) while the browser Origin is the public domain, which made
  // every login/signup POST fail with 403. Also accept the forwarded public host,
  // but only when a proxy is trusted (production).
  const hosts = [req.get("host")];
  if (IS_PROD && req.get("x-forwarded-host")) hosts.push(req.get("x-forwarded-host").split(",")[0].trim());
  const sameOrigin = hosts.includes(originUrl.host) && ["http:", "https:"].includes(originUrl.protocol);
  if (!sameOrigin && !allowedOrigins.includes(origin)) return res.status(403).json({ error: "Untrusted request origin." });
  next();
});

app.use(
  session({
    name: "foodhub.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // "auto" sends the Secure flag only when the request really arrived over
      // HTTPS (behind a TLS proxy this works via `trust proxy` above). A hard
      // `secure: IS_PROD` made the browser silently drop the cookie whenever
      // the production build was opened over plain http (localhost / Docker
      // on 127.0.0.1), so sign-in "succeeded" but never stuck.
      secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : "auto",
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
// Do not expose the backend source, database, environment files, Git metadata,
// or test fixtures through the static file server.
app.use((req, res, next) => {
  let decodedPath;
  try { decodedPath = decodeURIComponent(req.path); }
  catch (_) { return res.status(404).end(); }
  if (/^\/(?:backend|\.git|tests)(?:\/|$)/i.test(decodedPath)) {
    return res.status(404).end();
  }
  next();
});
// Serve the existing frontend from one origin so session cookies work normally.
const FRONTEND_DIR = path.join(__dirname, "..");
app.use(express.static(FRONTEND_DIR, { dotfiles: "deny", index: "index.html" }));

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
