// auth.js
document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const loggedInUser = localStorage.getItem("loggedInUser");
  
    console.log("Auth check - Logged in user:", loggedInUser); // Debugging line
  
    if (loggedInUser) {
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
      if (loginBtn) loginBtn.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("loggedInUser");
        alert("You have been logged out.");
        window.location.href = "login-small.html";
      });
    }
  });
  