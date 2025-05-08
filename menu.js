
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


document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const navMenu = document.querySelector('.navbar ul');

  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });
});
document.querySelector('.bxs-food-menu').addEventListener('click', function () {
  const popup = document.getElementById('popup');
  popup.style.display = 'block';
  setTimeout(() => popup.classList.add('show'), 10);
});

document.querySelector('#popup button').addEventListener('click', function () {
  const popup = document.getElementById('popup');
  popup.classList.remove('show');
  setTimeout(() => popup.style.display = 'none', 300);
});

function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.getElementById('cart-count').innerText = count;
}

// Call on page load
updateCartCount();
const navLinks = document.querySelectorAll('.navbar ul li a');

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navLinks.forEach(l => l.parentNode.classList.remove('active'));
    link.parentNode.classList.add('active');
  });
});
// Load favorites from localStorage
let favouriteItems = JSON.parse(localStorage.getItem('favouriteItems')) || [];

function saveFavouritesToLocal() {
  localStorage.setItem('favouriteItems', JSON.stringify(favouriteItems));
}

// Toggle favorite
document.querySelectorAll('.view-fav').forEach(icon => {
  const title = icon.getAttribute('data-title');

  // On load: visually mark as active if in favorites
  if (favouriteItems.some(item => item.title === title)) {
    icon.classList.add('active-heart');
  }

  icon.addEventListener('click', () => {
    const image = icon.getAttribute('data-image');
    const price = icon.getAttribute('data-price');
    const description = icon.getAttribute('data-description');

    const index = favouriteItems.findIndex(item => item.title === title);

    if (index === -1) {
      // Add to favorites
      favouriteItems.push({ title, image, price, description });
      icon.classList.add('active-heart');
    } else {
      // Remove from favorites
      favouriteItems.splice(index, 1);
      icon.classList.remove('active-heart');
    }

    saveFavouritesToLocal();
  });
});

// Show favorites popup
document.querySelector('.Activity-section .bx-heart').addEventListener('click', () => {
  const container = document.getElementById('favourites-container');
  container.innerHTML = '';

  if (favouriteItems.length === 0) {
    container.innerHTML = '<p>No favourites yet.</p>';
  } else {
    favouriteItems.forEach(item => {
      const favDiv = document.createElement('div');
      favDiv.className = 'fav-item';
      favDiv.innerHTML = `
        <img src="${item.image}" alt="${item.title}" width="100">
        <div>
          <h3>${item.title}</h3>
          <p>${item.price}</p>
          <p>${item.description}</p>
        </div>
      `;
      container.appendChild(favDiv);
    });
  }

  document.getElementById('favourite-list-popup').style.display = 'block';
});

function closeFavouriteList() {
  document.getElementById('favourite-list-popup').style.display = 'none';
}
function searchDishes() {
  const input = document.getElementById('searchInput').value.toLowerCase();
  const dishes = document.querySelectorAll('.desserts');

  dishes.forEach(dish => {
    const title = dish.querySelector('.name-and-price').textContent.toLowerCase();
    if (title.includes(input)) {
      dish.style.display = 'block';
    } else {
      dish.style.display = 'none';
    }
  });
}


