// Shared FoodHub product catalogue — now backed by the API/SQLite database
// instead of localStorage. Requires shared/api.js to be loaded first.

let _productsCache = null;
let _productsPromise = null;

// Fetch (and cache) the product catalogue from the server.
// Call with force=true after an admin edit to bypass the cache.
async function getProducts(force) {
  if (!force && _productsCache) return _productsCache;
  if (!_productsPromise) {
    _productsPromise = window.foodHubApi
      .get("/api/products")
      .then((data) => {
        _productsCache = data.products || [];
        _productsPromise = null;
        return _productsCache;
      })
      .catch((err) => {
        _productsPromise = null;
        console.error("Failed to load products", err);
        return _productsCache || [];
      });
  }
  return _productsPromise;
}

// Admin-only: create a product. Server verifies the admin session; this is
// just a convenience wrapper, not where the security check lives.
async function createProduct(product) {
  await window.foodHubApi.post("/api/products", product);
  return getProducts(true);
}

async function updateProduct(id, patch) {
  await window.foodHubApi.put(`/api/products/${encodeURIComponent(id)}`, patch);
  return getProducts(true);
}

async function deleteProduct(id) {
  await window.foodHubApi.del(`/api/products/${encodeURIComponent(id)}`);
  return getProducts(true);
}

// Escape text for safe use in HTML content and attribute values.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}


// Restrict catalogue image sources to same-origin HTTP(S) or HTTPS URLs.
function safeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.href);
    if (url.protocol === "https:" || (url.protocol === "http:" && url.origin === window.location.origin)) return url.href;
  } catch (_) { /* invalid URL */ }
  return "";
}
