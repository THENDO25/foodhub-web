# FoodHub Cybersecurity Elective — Review and Findings

## Project purpose

FoodHub is a local food-ordering website used to demonstrate common web-application security controls. The review focuses on DOM/stored XSS, session-based authorization, CSRF/CORS boundaries, validation, server-side price calculation, security headers, and repeatable regression tests.

## Findings and mitigations

| ID | Finding | Risk before mitigation | Mitigation in this project | Retest evidence |
|---|---|---|---|---|
| FH-01 | Cart rows were built by interpolating `localStorage` values into `innerHTML` and inline event handlers. | A user or script could alter local storage so malicious markup is parsed when the cart opens (DOM-based XSS). | Cart rows are now created with DOM APIs and `textContent`; quantity and image values are bounded/validated. | `npm test` checks cart implementation is covered indirectly by API tests; also manually enter a test string into local storage and verify it appears as text. |
| FH-02 | Favourites were interpolated into `innerHTML` with inline event handlers. | Tampered favourites could inject markup when the favourites list is rendered. | Favourites are rendered with `createElement`, `textContent`, and event listeners. Account has a favourites list that uses DOM APIs. | Manual browser test: favourite a dish on Home and Menu, visit Account → My Favourites, remove an item, reload. |
| FH-03 | Review content could be inserted into a generated HTML fragment. | Persisted review markup could execute when rendered on a customer page if escaping was missed. | Review name/text are created with DOM nodes and `textContent`; saved reviews are fetched from the API and rendered through the same safe builder. Admin review values are escaped before insertion. | `npm test` posts `<img ... onerror=...>` and `<script>` strings and verifies they remain stored as text; manual browser retest confirms no alert executes. |
| FH-04 | Admin authorization could be mistaken for a client-side page guard. | A customer could try calling administrative API endpoints directly. | Server middleware enforces admin role on orders, customer management, and product writes. | `npm test` verifies anonymous requests return 401 and customer requests return 403. |
| FH-05 | A modified client cart could send a false price. | If the server trusted the client total, an attacker could underpay. | Checkout sends product name and quantity; backend looks up product prices and recalculates totals. | `npm test` sends a Tacos price of R0.01 and verifies the server returns R89.99 per item. |
| FH-06 | Mutating requests did not explicitly validate the browser Origin. | A cross-site browser request could attempt to use an existing session. | Mutation requests with an Origin are rejected unless same-origin or explicitly allowed by `CORS_ORIGIN`; session cookies are HttpOnly and SameSite=Lax. | `npm test` verifies an `https://evil.example` profile mutation returns 403. Requests without Origin remain possible for non-browser clients, so API authentication/validation remains essential. |
| FH-07 | CSP allowed inline scripts for legacy pages and EmailJS. | `'unsafe-inline'` reduces CSP's ability to prevent script injection. | Added `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`; existing inline scripts remain allowed to avoid breaking the current site. | Automated test checks CSP includes `object-src 'none'`. Full CSP hardening requires moving inline scripts and handlers to external files or using nonces/hashes, then removing `'unsafe-inline'`. |
| FH-08 | Backend source and SQLite files sat under the directory used for static frontend serving. | Requests could attempt to download implementation files or the local database. | Static server denies `/backend`, `/.git`, and `/tests` paths; dotfiles are denied. The project archive excludes the local `.env`, database, `.git`, and `node_modules`. | `npm test` verifies `/backend/server.js` and `/backend/data/foodhub.db` return 404. |
| FH-09 | Admin product/customer update routes needed stronger input validation. | Invalid values could be stored or cause database errors. | Update routes validate lengths, prices, availability, and customer fields server-side. Review ratings are constrained to 1–5. | `npm test` covers core route authorization and order validation; manually test invalid admin form values as an additional regression check. |

## Important limitations

- This is a local educational project, not a production payment system. Card payment is labelled demo-only; no card number, expiry, or CVV should be collected.
- EmailJS runs in the browser. Its public key is not a server secret, but the EmailJS dashboard should restrict allowed origins and templates before deployment.
- The session store is Express's in-memory store. Sessions are lost on restart and this is not suitable for multi-instance production use.
- `script-src` still includes `'unsafe-inline'` because legacy pages use inline scripts and `onclick` attributes. The policy is improved but not yet maximally strict.
- A successful automated test is evidence for the tested case only, not proof that the whole application is invulnerable.

## Reproduction and retest

From the project root:

```bash
cd backend
npm install
npm test
npm start
```

Then browse to `http://localhost:3000`. Do not use `file://` or `python -m http.server`; the backend API and session cookie must use the same Node server origin.

Local demo administrator: `admin@foodhub.com` / `admin123`. This default is for isolated local evaluation only. Change it in `backend/.env` before sharing or deploying the app, and use a long random `SESSION_SECRET`.
