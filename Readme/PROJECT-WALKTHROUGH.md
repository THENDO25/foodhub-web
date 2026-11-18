# FoodHub Cybersecurity Elective

## 1. The Problem

FoodHub is a food ordering website where users can browse food, save favourites, write reviews, and place orders.

I identified security risks, such as users changing prices in the browser, unsafe review content, and unauthorized access to customer or admin information.

## 2. Project Goal

My goal is to make FoodHub safer by:

- Storing important data in an SQLite database.
- Protecting accounts with sessions and role-based access.
- Preventing unsafe content from running as code.
- Making sure the server calculates order prices correctly.
- Validating user input and blocking untrusted requests.
- Adding security headers and protecting backend files.
- Testing the security features.

## 3. How It Works

FoodHub uses a browser, an Express server, and an SQLite database.

The browser sends requests to the server, which checks permissions and processes the data.

Cart items and favourites are stored in the browser, but the server checks product prices before saving an order.

## 4. Security Features

### Cross-Site Scripting (XSS)
I made changes to display user input as text instead of allowing it to run as code. This helps protect customers and admins from malicious content in reviews.

### Authentication and Authorization
I use sessions and role checks to protect accounts and admin features. Customers cannot access admin-only functions.

### Price Manipulation
The server gets prices from the database and calculates the order total. This prevents users from changing prices in the browser to get cheaper orders.

### Request Protection
I added checks to help block requests from untrusted websites and configured security settings for browser requests.

### Security Headers
I use Helmet to add security headers and restrict access to sensitive backend files.

## 5. How I Demonstrate the Project

1. Start FoodHub and create a customer account.
2. Save favourite dishes and show that they remain available after reloading.
3. Add food to the cart and place an order.
4. Explain how the server checks prices and calculates the total.
5. Log in as admin and show the order.
6. Submit a test review containing HTML and show that it appears as text instead of running as code.
7. Run `npm test` and show the results.

## 6. Evidence

I will collect:

- A screenshot of the passing automated tests.
- A screenshot of my saved favourites.
- A screenshot of the review security test.
- A screenshot of an order in the admin dashboard.
- Terminal output showing the security headers.
- My completed `SECURITY-TESTING.md` checklist.

## 7. Limitations

- Some inline scripts are still allowed by the Content Security Policy. I can improve this later.
- EmailJS needs its own security settings.
- Sessions are stored in memory and reset when the server restarts.
- The card payment option is only a demonstration. Real payments are not supported.
- Automated tests only cover the cases they test, so I must also complete the manual security checks.

## Conclusion

This project helped me understand common could computing,web security risks and how to reduce them. I worked on protecting user accounts, validating orders, handling user input safely, and testing security features.

My goal is to keep improving FoodHub and apply what I have learned about cybersecurity and cloud computing.