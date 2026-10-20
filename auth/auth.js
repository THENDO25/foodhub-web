// Shared FoodHub sign-in, sign-out, and protected actions.
// Auth state now comes from the server session (shared/session.js), not
// localStorage — localStorage can be edited from DevTools console by anyone,
// which is exactly how the old prototype could be tricked into granting
// "customer" or "admin" access. Try it here: setting a fake flag in
// localStorage no longer has any effect, because every protected page/action
// re-asks the server.
(function () {
  const LOGIN_PATH = "../auth/login.html";

  async function requireCustomerLogin() {
    const isCustomer = await window.foodHubSession.isCustomer();
    if (isCustomer) return true;
    sessionStorage.setItem("foodhubReturnTo", window.location.href);
    alert("Please sign in first to order food or use favourites.");
    window.location.href = LOGIN_PATH;
    return false;
  }

  function signOut() {
    window.foodHubSession.signOut("../home/index.html");
  }

  window.foodHubRequireLogin = requireCustomerLogin;

  document.addEventListener("DOMContentLoaded", async function () {
    const user = await window.foodHubSession.get();
    const authButton = document.getElementById("auth-btn");

    // Keep one authentication button in the navbar.
    if (authButton) {
      const isSignedIn = Boolean(user && user.role === "customer");
      authButton.textContent = isSignedIn ? "Sign out" : "Sign in";
      authButton.href = isSignedIn ? "#" : LOGIN_PATH;
      authButton.setAttribute("aria-label", isSignedIn ? "Sign out" : "Sign in");
      authButton.onclick = isSignedIn ? function (event) {
        event.preventDefault();
        signOut();
      } : null;
      authButton.style.display = "inline-flex";
    }

    // Remove an older duplicate button if it exists in a cached or legacy navbar.
    document.querySelectorAll("header a, header button").forEach(function (element) {
      if (element.id === "auth-btn") return;
      if (element.textContent.trim().replace(/\s+/g, " ").toLowerCase() === "my account") {
        element.remove();
      }
    });

    // Direct access to cart and profile requires a customer session.
    const path = window.location.pathname;
    const isCustomer = Boolean(user && user.role === "customer");
    if ((path.endsWith("/cart/index.html") || path.endsWith("/manage-account/profile.html")) && !isCustomer) {
      sessionStorage.setItem("foodhubReturnTo", window.location.href);
      alert(path.endsWith("/cart/index.html")
        ? "Please sign in before placing an order."
        : "Please sign in to manage your account.");
      window.location.replace(LOGIN_PATH);
    }
  });

  // order and favourite actions work after signing in

  document.addEventListener("click", function (event) {
    const target = event.target.closest(
      ".add-product-cart, .view-fav, .bx-heart, .bx-cart, .addtocart, .checkout-btn"
    );
    if (!target) return;
    const user = window.foodHubSession.getCached();
    if (user && user.role === "customer") return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    requireCustomerLogin();
  }, true);
})();
