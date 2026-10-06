document.getElementById("admin-login-form").addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const password = document.getElementById("admin-password").value;

    if (email === "admin@foodhub.com" && password === "admin123") {

        localStorage.setItem("loggedInUser", email);
        localStorage.setItem("userRole", "admin");

        window.location.href = "index.html";

    } else {
        document.getElementById("login-error").textContent =
            "Invalid admin email or password.";
    }
});