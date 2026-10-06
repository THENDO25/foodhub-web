// Shared FoodHub navbar behavior.
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menu-toggle");
  const navbar = document.querySelector(".navbar ul");
  const hamburgerIcon = document.getElementById("hamburger-icon");
  const closeIcon = document.getElementById("close-icon");

  if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
      const open = navbar.classList.toggle("active");
      if (hamburgerIcon) hamburgerIcon.style.display = open ? "none" : "inline";
      if (closeIcon) closeIcon.style.display = open ? "inline" : "none";
    });

    navbar.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navbar.classList.remove("active");
        if (hamburgerIcon) hamburgerIcon.style.display = "inline";
        if (closeIcon) closeIcon.style.display = "none";
      });
    });
  }

  // Highlight the current main navigation page on every page.
  const current = new URL(window.location.href);
  document.querySelectorAll(".navbar ul a").forEach(link => {
    const target = new URL(link.href, document.baseURI);
    if (target.pathname === current.pathname) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
  });
});
