// Cart and favourites helpers shared by the home and menu pages.
// User-controlled localStorage values are treated as untrusted data.
(function () {
  "use strict";

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function saveArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function safeImageSource(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const url = new URL(raw, window.location.href);
      if (url.protocol !== "https:" && url.origin !== window.location.origin) return "";
      if (url.protocol !== "https:" && url.protocol !== "http:") return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  function getItemFromIcon(icon) {
    const parent = icon.closest(".main-dish, .breakfast, .desserts, .Fastfood, .special-box");
    const titleNode = parent && (parent.querySelector(".name-and-price h2") || parent.querySelector(".innertxt h2") || parent.querySelector("h2"));
    const priceNode = parent && (parent.querySelector(".name-and-price h2:nth-child(2)") || parent.querySelector(".total-price-1"));
    const title = String(icon.dataset.title || (titleNode && titleNode.textContent) || "").trim();
    const image = safeImageSource(icon.dataset.image || (parent && parent.querySelector("img") && parent.querySelector("img").getAttribute("src")) || "");
    const rawPrice = icon.dataset.price || (priceNode && priceNode.textContent) || "0";
    const price = Number(String(rawPrice).replace(/[^\d.]/g, "")) || 0;
    const description = String(icon.dataset.description || (parent && parent.querySelector("p") && parent.querySelector("p").textContent) || "");
    const cartIcon = parent && parent.querySelector(".bx-cart[onclick]");
    let cartName = icon.dataset.cartName || title;
    if (cartIcon) {
      const match = (cartIcon.getAttribute("onclick") || "").match(/^\s*addToCart\(['"]([^'"]+)/);
      if (match) cartName = match[1];
    }
    return { title, name: title, cartName, image, imgSrc: image, price, description };
  }

  function showCustomAlert(message = "Added to favourites ❤️") {
    const alertBox = document.getElementById("custom-alert");
    if (!alertBox) return;
    const messageNode = alertBox.querySelector("p");
    if (messageNode) messageNode.textContent = message;
    alertBox.classList.remove("hidden");
    alertBox.classList.add("show");
    window.clearTimeout(showCustomAlert.timer);
    showCustomAlert.timer = window.setTimeout(() => {
      alertBox.classList.remove("show");
      alertBox.classList.add("hidden");
    }, 2000);
  }

  function addToCart(name, price, image, quantity = 1) {
    const cart = readArray("cart");
    const safeName = String(name || "").trim();
    const safePrice = Number(price);
    const safeQuantity = Math.min(50, Math.max(1, Math.floor(Number(quantity) || 1)));
    if (!safeName || !Number.isFinite(safePrice) || safePrice < 0) return;
    const existing = cart.find(item => (item.name || item.title) === safeName);
    if (existing) existing.quantity = Math.min(50, Math.max(1, Number(existing.quantity) || 1) + safeQuantity);
    else cart.push({ name: safeName, title: safeName, price: safePrice, image: safeImageSource(image), imgSrc: safeImageSource(image), quantity: safeQuantity });
    saveArray("cart", cart);
    updateCartCount();
    showCustomAlert(`${safeName} added to cart`);
  }

  function updateCartCount() {
    const count = readArray("cart").reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
    const node = document.getElementById("cart-count");
    if (node) node.textContent = String(count);
  }

  function readFavorites() {
    return readArray("favorites").filter(item => item && typeof item === "object");
  }

  function renderFavorites() {
    const list = document.getElementById("favorites-list");
    if (!list) return;
    list.replaceChildren();
    const favorites = readFavorites();
    if (!favorites.length) {
      const empty = document.createElement("li");
      empty.textContent = "You have not added any favourites yet.";
      list.appendChild(empty);
      return;
    }
    favorites.forEach((item, index) => {
      const li = document.createElement("li");
      const img = document.createElement("img");
      img.src = safeImageSource(item.image || item.imgSrc);
      img.alt = String(item.title || item.name || "Food item");
      img.loading = "lazy";
      const label = document.createElement("span");
      label.textContent = `${String(item.title || item.name || "Food item")} - R${(Number(item.price) || 0).toFixed(2)}`;
      const cartButton = document.createElement("button");
      cartButton.type = "button";
      cartButton.className = "cart-btn";
      cartButton.textContent = "Add to cart";
      cartButton.addEventListener("click", () => addToCart(item.cartName || item.name || item.title, item.price, item.image || item.imgSrc));
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-btn";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", () => removeFavorite(index));
      li.append(img, label, cartButton, removeButton);
      list.appendChild(li);
    });
  }

  function updateFavoritesUI() { renderFavorites(); }

  function toggleFoodHubFavorite(icon) {
    const item = getItemFromIcon(icon);
    if (!item.title) {
      console.warn("FoodHub could not identify this favourite item.");
      return;
    }
    const favorites = readFavorites();
    const index = favorites.findIndex(fav => (fav.title || fav.name) === item.title);
    if (index === -1) {
      favorites.push(item);
      icon.classList.add("active-heart");
      icon.setAttribute("aria-label", "Remove from favourites");
      showCustomAlert("Added item to favourites ❤️");
    } else {
      favorites.splice(index, 1);
      icon.classList.remove("active-heart");
      icon.setAttribute("aria-label", "Add to favourites");
      showCustomAlert("Removed from favourites");
    }
    saveArray("favorites", favorites);
    renderFavorites();
  }

  function removeFavorite(index) {
    const favorites = readFavorites();
    if (!Number.isInteger(Number(index)) || !favorites[Number(index)]) return;
    favorites.splice(Number(index), 1);
    saveArray("favorites", favorites);
    renderFavorites();
    document.querySelectorAll(".bx-heart").forEach(icon => {
      const item = getItemFromIcon(icon);
      icon.classList.toggle("active-heart", favorites.some(fav => (fav.title || fav.name) === item.title));
    });
  }

  function closeFavorites() {
    const popup = document.getElementById("favorites-popup");
    if (popup) popup.classList.add("hidden");
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Static cards use this delegated handler; dynamic .view-fav cards are handled by menu/menu.js.
    document.addEventListener("click", event => {
      const icon = event.target.closest(".Activity-section-menu .bx-heart:not(.view-fav)");
      if (icon) toggleFoodHubFavorite(icon);
      if (event.target.closest(".Activity-section .bx-heart")) {
        renderFavorites();
        const popup = document.getElementById("favorites-popup");
        if (popup) popup.classList.remove("hidden");
      }
    });
    const favorites = readFavorites();
    document.querySelectorAll(".bx-heart").forEach(icon => {
      const item = getItemFromIcon(icon);
      icon.classList.toggle("active-heart", favorites.some(fav => (fav.title || fav.name) === item.title));
    });
    renderFavorites();
    updateCartCount();
  });

  // Keep legacy inline cart buttons working while new cards use delegated events.
  window.addToCart = addToCart;
  window.updateCartCount = updateCartCount;
  window.toggleFoodHubFavorite = toggleFoodHubFavorite;
  window.updateFavoritesUI = updateFavoritesUI;
  window.removeFavorite = removeFavorite;
  window.closeFavorites = closeFavorites;
  window.showCustomAlert = showCustomAlert;
})();
