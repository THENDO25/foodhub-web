// Admin login
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    // Demo login
    if (email === "admin@foodhub.com" && password === "admin123") {

        sessionStorage.setItem("adminLoggedIn", "true");

        window.location.href = "index.html";

    } else {

        loginError.textContent = "Invalid email or password.";

    }
});