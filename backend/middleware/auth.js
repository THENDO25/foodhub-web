// Server-side auth checks. The original prototype only hid buttons/pages with
// client-side JS (localStorage.getItem("userRole") === "admin"), which anyone
// can fake from DevTools. Every protected route here is enforced on the server,
// based only on the session cookie — never on anything the client claims.

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not signed in." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not signed in." });
  }
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
