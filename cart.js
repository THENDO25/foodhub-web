function addToCart(name, price, image) {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  const existingItem = cart.find(item => item.name === name);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ name, price, image, quantity: 1 });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  showCustomAlert(`${name} Added to cart`);

}
let cart = JSON.parse(localStorage.getItem('cart')) || [];

document.addEventListener('DOMContentLoaded', () => {
  const addToCartBtn = document.querySelector('.addtocart');

  addToCartBtn.addEventListener('click', () => {
    const title = document.getElementById('popup-title').innerText;
    const imgSrc = document.getElementById('popup-img').src;
    const priceText = document.getElementById('popup-price').innerText || "R0";
    const price = parseFloat(priceText.replace("R", ""));
    const quantity = parseInt(document.querySelector('.popup-quantity-container .number').innerText);

    const item = {
      title,
      imgSrc,
      price,
      quantity
    };

    // Check if item is already in cart and update quantity
    const existingItem = cart.find(cartItem => cartItem.title === title);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.push(item);
    }

    saveCart();
    showCustomAlert('Added item to cart 🛒');
    updateCartUI(); // Optional: if you have a cart UI
  });
});

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

document.addEventListener('DOMContentLoaded', () => {
  const favoriteIcons = document.querySelectorAll('.Activity-section-menu .bx-heart')|| ('.popup .bx-heart');
  const openFavoritesIcon = document.querySelector('.Activity-section .bx-heart');
  const favoritesList = document.getElementById('favorites-list');
  const popup = document.getElementById('favorites-popup');

  // Add to favorites
  favoriteIcons.forEach(icon => {
    icon.addEventListener('click', () => {
      showCustomAlert('Added item to favorite ❤️');

      const parent = icon.closest('.main-dish') || icon.closest('.breakfast') || icon.closest('.desserts') || icon.closest('.Fastfood');
      const title = parent.querySelector('h2').innerText;
      const imgSrc = parent.querySelector('img').src;
      const priceText = parent.querySelectorAll('h2')[1]?.innerText || "R0";
      const price = parseFloat(priceText.replace("R", ""));

      const item = { title, imgSrc, price };

      if (!favorites.some(fav => fav.title === title)) {
        favorites.push(item);
        saveFavorites();
        updateFavoritesUI();
      }
    });
  });

  // Open popup
  openFavoritesIcon.addEventListener('click', () => {
    updateFavoritesUI();
    popup.classList.remove('hidden');
  });

  // Initialize UI
  updateFavoritesUI();
});

function updateFavoritesUI() {
  const list = document.getElementById('favorites-list');
  list.innerHTML = '';

  favorites.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <img src="${item.imgSrc}" alt="${item.title}">
      <span>${item.title} - R${item.price.toFixed(2)}</span>
      <button onclick="addToCart('${item.title}', ${item.price}, '${item.imgSrc}')" class="cart-btn">Cart</button>
      <button onclick="removeFavorite(${index})" class="remove-btn">Remove</button>
    `;
    list.appendChild(li);
  });
}

function removeFavorite(index) {
  favorites.splice(index, 1);
  saveFavorites();
  updateFavoritesUI();
}

function saveFavorites() {
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

function closeFavorites() {
  document.getElementById('favorites-popup').classList.add('hidden');
}
function showCustomAlert(message = "Added to favorites!") {
  const alertBox = document.getElementById("custom-alert");
  alertBox.querySelector("p").textContent = message;

  alertBox.classList.remove("hidden");
  alertBox.classList.add("show");

  setTimeout(() => {
    alertBox.classList.remove("show");
    alertBox.classList.add("hidden");
  }, 2000);
}



