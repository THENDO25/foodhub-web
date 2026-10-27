// Menu page logic

function getMenuCategory() {
  const page = window.location.pathname.split("/").pop();

  if (page === "index.html") return "Breakfast";
  if (page === "main-dish.html") return "Main Dish";
  if (page === "desserts.html") return "Desserts";
  if (page === "snacks.html") return "Snacks & Drinks";

  return "";
}

async function renderCustomerMenu() {
  const category = getMenuCategory();
  const container = document.querySelector(".menu-grid-container");

  if (!category || !container) return;

  const allProducts = await getProducts();
  const products = allProducts.filter(product =>
    product.category === category && product.available !== false
  );

  container.innerHTML = products.map(product => `
    <div class="${category === "Breakfast" ? "breakfast" : category === "Main Dish" ? "main-dish" : "desserts"}">

      <img src="${escapeHtml(typeof safeImageUrl === "function" ? safeImageUrl(product.image) : "")}" alt="${escapeHtml(product.name)}" loading="lazy">

      <div class="innertxt">

        <div class="name-and-price">
          <h2 class="name-and-price">${escapeHtml(product.name)}</h2>
          <h2 class="name-and-price">R${Number(product.price).toFixed(2)}</h2>
        </div>

        <p>${escapeHtml(product.description || "Enjoy our tasty food made with love")}</p>

        <div class="Activity-section-menu">

          <i class="bx bxs-food-menu view-popup"
            data-image="${escapeHtml(typeof safeImageUrl === "function" ? safeImageUrl(product.image) : "")}"
            data-title="${escapeHtml(product.name)}"
            data-price="R${Number(product.price).toFixed(2)}"
            data-description="${escapeHtml(product.description || "") }"
            data-details="${escapeHtml(product.details || product.description || "")}">
          </i>

          <i class="bx bx-heart view-fav"
            data-image="${escapeHtml(typeof safeImageUrl === "function" ? safeImageUrl(product.image) : "")}"
            data-title="${escapeHtml(product.name)}"
            data-price="R${Number(product.price).toFixed(2)}"
            data-description="${escapeHtml(product.description || "")}">
          </i>

          <i class="bx bx-cart add-product-cart"
            data-name="${escapeHtml(product.cartName || product.name)}"
            data-price="${Number(product.price)}"
            data-image="${escapeHtml(typeof safeImageUrl === "function" ? safeImageUrl(product.image) : "")}">
          </i>

        </div>
      </div>
    </div>
  `).join("");

  let savedFavorites = [];
  try {
    const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
    savedFavorites = Array.isArray(saved) ? saved : [];
  } catch (_) { savedFavorites = []; }
  container.querySelectorAll(".view-fav").forEach(icon => {
    const title = icon.dataset.title;
    const active = savedFavorites.some(item => (item.title || item.name) === title);
    icon.classList.toggle("active-heart", active);
    icon.setAttribute("aria-label", active ? "Remove from favourites" : "Add to favourites");
    icon.setAttribute("role", "button");
    icon.setAttribute("tabindex", "0");
  });
}

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const count = cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const cartCount = document.getElementById("cart-count");

  if (cartCount) cartCount.innerText = count;
}

function addMenuItemToCart(name, price, image) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existingItem = cart.find(item => item.name === name || item.title === name);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, image, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();

  if (typeof showCustomAlert === "function") {
    showCustomAlert(`${name} Added to cart`);
  }
}

function setupMenuEvents() {
  const container = document.querySelector(".menu-grid-container");

  if (!container) return;

  container.addEventListener("click", event => {
    const cartButton = event.target.closest(".add-product-cart");
    const popupButton = event.target.closest(".view-popup");
    const favoriteButton = event.target.closest(".view-fav");

    if (cartButton) {
      addMenuItemToCart(
        cartButton.dataset.name,
        Number(cartButton.dataset.price),
        cartButton.dataset.image
      );
    }

    if (popupButton) {
      openProductPopup(popupButton);
    }

    if (favoriteButton) {
      toggleMenuFavorite(favoriteButton);
    }
  });
}

function openProductPopup(icon) {
  const popup = document.getElementById("global-popup");
  if (!popup) return;

  document.getElementById("popup-img").src = icon.dataset.image;
  document.getElementById("popup-title").textContent = icon.dataset.title;
  document.getElementById("popup-price").textContent = icon.dataset.price;
  document.getElementById("popup-description").textContent = icon.dataset.description || "";
  document.getElementById("popup-details").textContent = icon.dataset.details || "";

  const quantity = document.querySelector(".popup-quantity-container .number");
  if (quantity) quantity.textContent = "1";

  const total = document.getElementById("popup-total");
  if (total) total.textContent = `TOTAL ${icon.dataset.price}`;

  popup.style.display = "block";
  setTimeout(() => popup.classList.add("show"), 10);
}

function toggleMenuFavorite(icon) {
  if (typeof window.toggleFoodHubFavorite === "function") {
    window.toggleFoodHubFavorite(icon);
  }
}

function closeFavouriteList() {
  const popup = document.getElementById("favorites-popup");
  if (popup) popup.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  renderCustomerMenu();
  setupMenuEvents();
  updateCartCount();
});


window.addEventListener("focus", async () => {
  await getProducts(true);
  renderCustomerMenu();
  updateCartCount();
});
