# FoodHub Security Testing Guide

This guide explains how I test FoodHub's security features and check that the main website functions still work.

## 1. Run the Automated Security Test

Open a terminal and run:

```bash
cd backend
npm install
npm test
```

The test uses a temporary database, so it does not change my normal FoodHub data.

**Expected result:** The security test passes. If it fails, I check the error and fix the problem before marking the test as passed.

## 2. Start FoodHub

In the terminal, run:

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and set a new admin password and a strong, random `SESSION_SECRET`.

Then start the server:

```bash
npm start
```

Open `http://localhost:3000` in your browser.

**Important:** Use the same address throughout testing. Do not open the HTML files directly or use another web server.

## 3. Manual Security Tests

### A. Cart and Favourites Security (XSS)

This test checks whether unsafe content stored in the browser can run as code.

1. Sign in to FoodHub.
2. Open your browser's Developer Tools and select Console.
3. Enter the following test:

```javascript
localStorage.setItem('cart', JSON.stringify([
  {name:'<img src=x onerror=alert(1)>',price:1,image:'javascript:alert(2)',quantity:1}
]));
location.href = '/cart/index.html';
```

**Expected result:** The product name appears as text, no alert appears, and the unsafe image URL is rejected.

After testing, clear the test data:

```javascript
localStorage.removeItem('cart');
```

Repeat a similar test for favourites:

```javascript
localStorage.setItem('favorites', JSON.stringify([
  {title:'<img src=x onerror=alert(1)>',price:1,imgSrc:'javascript:alert(2)'}
]));
location.href = '/manage-account/profile.html';
```

**Expected result:** The title appears as text, and no alert appears.

Remove the test data afterwards:

```javascript
localStorage.removeItem('favorites');
```

### B. Review Security (Stored XSS)

This test checks whether unsafe content in reviews can run as code.

1. Open the Reviews page.
2. Submit this test string as a review:

```html
<img src=x onerror=alert(1)> <script>alert(2)</script>
```

3. Check the customer Reviews page and the admin Reviews section.
4. Reload the pages and check again.

**Expected result:** The review appears as plain text, and no alert appears.

### C. Login, Permissions and Order Prices

1. Sign out and try opening `/admin/admin.html`. The page should redirect you to login.
2. While signed out, open the browser Console and run:

```javascript
fetch('/api/orders').then(r => r.status)
```

Expected result: `401` because you are not logged in.

3. Sign in as a customer and run:

```javascript
fetch('/api/admin/customers').then(r => r.status)
```

Expected result: `403` because customers cannot access this admin-only API.

4. Place an order and check it in Admin → Orders.

**Expected result:** The order total matches the prices stored in the database, not prices changed in the browser.


## 4. Main Website Testing Checklist

After the security tests, check that the main features still work.

- [ ] Customer signup and login work.
- [ ] Logging out ends the session.
- [ ] Customers can favourite dishes on Home and Menu.
- [ ] My Favourites displays saved dishes and allows removal.
- [ ] Cart quantity and remove buttons work correctly.
- [ ] Empty carts cannot be checked out.
- [ ] Customers must log in before placing orders.
- [ ] Orders appear in My Orders and Admin → Orders.
- [ ] Admin can add, edit, enable, disable and delete products.
- [ ] Product changes appear on the Menu page.
- [ ] Customers cannot access admin-only APIs.
- [ ] Review test content appears as text on customer and admin pages.


## Conclusion

These tests help me check whether my FoodHub security improvements work as expected. They also help me find problems and collect evidence for my cybersecurity elective.