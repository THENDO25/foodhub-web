const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('../backend/node_modules/better-sqlite3');

let serverProcess;
let baseUrl;
let dbPath;
const adminEmail = 'security-admin@foodhub.test';
const adminPassword = 'SafeDemoAdmin123!';

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${url}/api/products`);
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('FoodHub server did not start in time.');
}

async function request(pathname, { method = 'GET', body, cookie, origin } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  const setCookie = response.headers.get('set-cookie');
  return { response, data, cookie: setCookie ? setCookie.split(';')[0] : cookie };
}

before(async () => {
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'foodhub-security-')), 'foodhub-test.db');
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..', 'backend'),
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-only-session-secret-with-more-than-32-characters',
      DB_PATH: dbPath,
      ADMIN_EMAIL: adminEmail,
      ADMIN_PASSWORD: adminPassword,
      CORS_ORIGIN: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  serverProcess.stderr.on('data', chunk => { stderr += chunk.toString(); });
  serverProcess.on('exit', code => {
    if (code && code !== 0) process.stderr.write(`FoodHub test server exited ${code}: ${stderr}\n`);
  });
  await waitForServer(baseUrl);
});

after(async () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 200));
});

test('FoodHub security and core API regression checks', async () => {
  // Security headers and public catalogue.
  const products = await request('/api/products');
  assert.equal(products.response.status, 200);
  assert.ok(products.data.products.length > 0, 'seeded catalogue should be available');
  assert.match(products.response.headers.get('content-security-policy') || '', /object-src 'none'/);
  assert.equal(products.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(products.response.headers.get('x-frame-options'), 'DENY');
  const untrustedRead = await request('/api/products', { origin: 'https://evil.example' });
  assert.equal(untrustedRead.response.headers.get('access-control-allow-origin'), null);

  // Protected endpoints must deny anonymous access.
  assert.equal((await request('/api/orders')).response.status, 401);
  assert.equal((await request('/api/admin/customers')).response.status, 401);
  assert.equal((await request('/api/profile')).response.status, 401);
  assert.equal((await request('/api/orders', { method: 'POST', body: { address: '1 Main Street', paymentMethod: 'cod', items: [] } })).response.status, 401);

  // Signup establishes an httpOnly session; password is hashed in SQLite.
  const signup = await request('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Security Test Customer', email: 'customer-security@example.test', password: 'CustomerPass123!' },
  });
  assert.equal(signup.response.status, 201, JSON.stringify(signup.data));
  assert.ok(signup.cookie && signup.cookie.startsWith('foodhub.sid='));
  assert.match(signup.response.headers.get('set-cookie') || '', /HttpOnly/i);
  assert.match(signup.response.headers.get('set-cookie') || '', /SameSite=Lax/i);
  const db = new Database(dbPath, { readonly: true });
  const customer = db.prepare('SELECT password_hash, role FROM users WHERE email = ?').get('customer-security@example.test');
  assert.equal(customer.role, 'customer');
  assert.match(customer.password_hash, /^\$2[aby]\$/);
  assert.notEqual(customer.password_hash, 'CustomerPass123!');
  db.close();

  // Session-based profile and cross-origin mutation rejection.
  assert.equal((await request('/api/profile', { cookie: signup.cookie })).response.status, 200);
  const csrf = await request('/api/profile', {
    method: 'PUT', cookie: signup.cookie, origin: 'https://evil.example',
    body: { name: 'Compromised Name', phone: '', address: '' },
  });
  assert.equal(csrf.response.status, 403);

  // A customer cannot use admin-only product or customer management APIs.
  assert.equal((await request('/api/products', { method: 'POST', cookie: signup.cookie, body: { id: 'evil-product', name: 'Bad', category: 'Breakfast', price: 1 } })).response.status, 403);
  assert.equal((await request('/api/admin/customers', { cookie: signup.cookie })).response.status, 403);

  // Server recalculates the order from trusted product data; supplied price is ignored.
  const order = await request('/api/orders', {
    method: 'POST', cookie: signup.cookie,
    body: { address: '12 Test Road', paymentMethod: 'cod', items: [{ name: 'Tacos', quantity: 2, price: 0.01 }] },
  });
  assert.equal(order.response.status, 201, JSON.stringify(order.data));
  assert.equal(Number(order.data.order.total.toFixed(2)), 179.98);
  assert.equal(order.data.order.products[0].price, 89.99);
  const badQuantity = await request('/api/orders', {
    method: 'POST', cookie: signup.cookie,
    body: { address: '12 Test Road', paymentMethod: 'cod', items: [{ name: 'Tacos', quantity: 0 }] },
  });
  assert.equal(badQuantity.response.status, 400);
  assert.equal((await request('/api/orders', { cookie: signup.cookie })).response.status, 403);
  assert.equal((await request('/api/orders/mine', { cookie: signup.cookie })).data.orders.length, 1);

  // Stored review text is persisted as data, and frontend rendering no longer
  // uses dynamic HTML insertion for reviews, cart rows, or favourites rows.
  const payload = '<img src=x onerror=alert(1)> <script>alert(2)</script>';
  const review = await request('/api/reviews', { method: 'POST', body: { text: payload, rating: 5 } });
  assert.equal(review.response.status, 201, JSON.stringify(review.data));
  assert.equal(review.data.review.text, payload);
  const reviews = await request('/api/reviews');
  assert.ok(reviews.data.reviews.some(item => item.text === payload));
  const invalidRating = await request('/api/reviews', { method: 'POST', body: { text: 'Invalid rating test', rating: 9 } });
  assert.equal(invalidRating.response.status, 400);

  // Admin credentials are seeded only for this isolated test database.
  const adminLogin = await request('/api/auth/login', { method: 'POST', body: { email: adminEmail, password: adminPassword } });
  assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.data));
  assert.equal((await request('/api/orders', { cookie: adminLogin.cookie })).response.status, 200);
  const adminCustomers = await request('/api/admin/customers', { cookie: adminLogin.cookie });
  assert.equal(adminCustomers.response.status, 200);
  assert.ok(!JSON.stringify(adminCustomers.data).includes('password_hash'));
  const invalidProductEdit = await request('/api/products/breakfast-tacos', {
    method: 'PUT', cookie: adminLogin.cookie, body: { price: -10 },
  });
  assert.equal(invalidProductEdit.response.status, 400);

  // Regression guard against reintroducing known unsafe render sinks.
  const projectRoot = path.join(__dirname, '..');
  const cartJs = fs.readFileSync(path.join(projectRoot, 'cart/cart.js'), 'utf8');
  const cartHtml = fs.readFileSync(path.join(projectRoot, 'cart/index.html'), 'utf8');
  const reviewJs = fs.readFileSync(path.join(projectRoot, 'reviews/review.js'), 'utf8');
  assert.ok(!cartJs.includes('innerHTML'));
  assert.ok(!cartHtml.includes('cartItemsContainer.innerHTML'));
  const profileJs = fs.readFileSync(path.join(projectRoot, 'manage-account/profile.js'), 'utf8');
  const favouritesSource = profileJs.slice(profileJs.indexOf('function renderFavourites'), profileJs.indexOf('function escapeHtml'));
  assert.ok(!favouritesSource.includes('innerHTML'));
  assert.ok(!reviewJs.includes('temp.innerHTML'));
  assert.ok(!reviewJs.includes('reviewWrapper.innerHTML'));

  // Sensitive implementation files must not be served as frontend assets.
  assert.equal((await request('/backend/server.js')).response.status, 404);
  assert.equal((await request('/backend/data/foodhub.db')).response.status, 404);
});
