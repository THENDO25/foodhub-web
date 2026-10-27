# FoodHub Security Testing Guide

## 1. Start with a clean isolated test environment

The automated suite starts its own server with a temporary SQLite database and temporary admin account. It does not use or overwrite your normal FoodHub database.

```bash
cd backend
npm install
npm test
```

Expected result: one security regression test passes. If it fails, capture the failing assertion and fix it before claiming the control passed.

## 2. Start the application

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set a long random `SESSION_SECRET` and a new `ADMIN_PASSWORD`. For local demo only, you can keep `NODE_ENV=development`. Then run:

```bash
npm start
```

Open `http://localhost:3000` in one browser tab. Do not mix `localhost`, `127.0.0.1`, `file://`, or a separate Python web server in the same test; session cookies are origin-specific.

## 3. Manual browser retests

### A. DOM-based XSS in cart/favourites

1. Sign up and sign in.
2. Open DevTools → Console and run:

   ```js
   localStorage.setItem('cart', JSON.stringify([{name:'<img src=x onerror=alert(1)>',price:1,image:'javascript:alert(2)',quantity:1}]));
   location.href = '/cart/index.html';
   ```

3. Expected: the name is displayed as text, no alert appears, and the image source is rejected. Clear the test data afterward with `localStorage.removeItem('cart')`.
4. Repeat for favourites:

   ```js
   localStorage.setItem('favorites', JSON.stringify([{title:'<img src=x onerror=alert(1)>',price:1,imgSrc:'javascript:alert(2)'}]));
   location.href = '/manage-account/profile.html';
   ```

   Expected: the title is text; no alert appears. Remove the test entry afterward.

### B. Stored XSS in reviews

1. Open Reviews while signed in or signed out.
2. Submit this harmless test string as a review:

   ```html
   <img src=x onerror=alert(1)> <script>alert(2)</script>
   ```

3. Expected: no alert executes. The review is visible as literal text on the customer page and in the admin Reviews section.
4. Reload the Reviews page to verify the persisted review is still displayed as text.

### C. Authorization and price integrity

1. Sign out and try to open `/admin/admin.html`; the UI should redirect to login.
2. In DevTools Console while signed out, try `fetch('/api/orders').then(r => r.status)`; expected `401`.
3. Sign in as a customer and try `fetch('/api/admin/customers').then(r => r.status)`; expected `403`.
4. Place an order, then inspect the order in Admin → Orders. The total must match the database catalogue, not a client-side price edit.

### D. CSP and security headers

Run in a terminal:

```bash
curl -s -D - -o /dev/null http://localhost:3000/
```

Check `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy`. CSP currently retains `'unsafe-inline'` for compatibility; document that as remaining work rather than claiming strict CSP completion.

### E. Core regression checklist

- [ ] Customer signup and sign-in work.
- [ ] Sign out clears the server session.
- [ ] Customer can favourite on Home and Menu.
- [ ] Account → My Favourites lists saved dishes and allows removal.
- [ ] Cart plus/minus/remove controls work and totals update.
- [ ] Empty cart cannot be checked out.
- [ ] Checkout requires a customer session.
- [ ] Order appears in Account → My Orders and Admin → Orders.
- [ ] Admin can create/edit/toggle/delete products and changes appear on Menu.
- [ ] Customer cannot call admin-only APIs.
- [ ] Review test payload remains plain text on customer and admin views.

Record actual outcomes, browser, date, and screenshots for your elective evidence.
