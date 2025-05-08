document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menu-toggle");
  const navbar = document.querySelector(".navbar ul");
  const hamburgerIcon = document.getElementById("hamburger-icon");
  const closeIcon = document.getElementById("close-icon");

  menuToggle.addEventListener("click", () => {
    navbar.classList.toggle("active");

    // Toggle between hamburger and close icons
    if (navbar.classList.contains("active")) {
      hamburgerIcon.style.display = "none";
      closeIcon.style.display = "inline";
    } else {
      hamburgerIcon.style.display = "inline";
      closeIcon.style.display = "none";
    }
  });
});
