// Admin dashboard — now backed by the real API/SQLite database.
//
// The actual access control happens on the server: every /api/orders,
// /api/admin/customers, and product-write request checks req.session.role
// server-side (see backend/middleware/auth.js). The check below is only a
// client-side convenience so a non-admin gets redirected instead of staring
// at a dashboard full of failed requests — it is NOT what's stopping an
// attacker. Confirm this yourself: try opening this page with a customer
// session (or no session) and calling the API routes directly.

(async function initAdmin() {
  const user = await window.foodHubSession.get();
  if (!user || user.role !== "admin") {
    window.location.replace("../auth/login.html");
    return;
  }
  boot();
})();

function boot() {

function money(value) {
  return `R${Number(value).toFixed(2)}`;
}

// Live data, loaded from the API.
let orders = [];
let products = [];
let customers = [];
let reviews = [];

async function loadAll() {
  const [ordersRes, customersRes, productsRes, reviewsRes] = await Promise.all([
    window.foodHubApi.get("/api/orders"),
    window.foodHubApi.get("/api/admin/customers"),
    getProducts(true),
    window.foodHubApi.get("/api/reviews"),
  ]);
  orders = ordersRes.orders || [];
  customers = customersRes.customers || [];
  products = productsRes || [];
  reviews = reviewsRes.reviews || [];
}

// Page sections
const sectionTitles = {
  dashboard: "Dashboard",
  orders: "Orders",
  products: "Products",
  customers: "Customers",
  reviews: "Reviews"
};

function showSection(name) {
  document.querySelectorAll(".admin-section").forEach(section => {
    section.classList.remove("active");
  });

  document.querySelector(`#${name}-section`).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.section === name);
  });

  document.getElementById("page-title").textContent = sectionTitles[name];
  document.getElementById("sidebar").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Navigation
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => showSection(item.dataset.section));
});

document.querySelectorAll("[data-section-target]").forEach(button => {
  button.addEventListener("click", () => showSection(button.dataset.sectionTarget));
});

// Mobile menu
document.getElementById("mobile-menu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// Admin logout
document.getElementById("admin-logout").addEventListener("click", () => {
  if (confirm("Log out of the admin dashboard?")) {
    window.foodHubSession.signOut("../auth/login.html");
  }
});

// Dashboard
function renderDashboard() {
  const revenue = orders
    .filter(order => order.status !== "Cancelled")
    .reduce((sum, order) => sum + Number(order.total), 0);

  const pending = orders.filter(order =>
    order.status === "Pending" || order.status === "Preparing"
  ).length;

  const rated = reviews.filter(review => Number(review.rating) >= 1 && Number(review.rating) <= 5);
  const average = rated.length
    ? rated.reduce((sum, review) => sum + Number(review.rating), 0) / rated.length
    : 0;

  document.getElementById("total-orders").textContent = orders.length;
  document.getElementById("total-revenue").textContent = money(revenue);
  document.getElementById("total-customers").textContent = customers.length;
  document.getElementById("total-reviews").textContent = reviews.length;
  document.getElementById("orders-summary").textContent = `${pending} active`;
  document.getElementById("rating-summary").textContent = rated.length ? `Average rating ${average.toFixed(1)}` : "No ratings yet";
  document.getElementById("pending-nav-count").textContent = pending;

  document.getElementById("recent-orders").innerHTML = orders.slice(0, 5).map(order => `
    <tr>
      <td><strong>${escapeHtml(order.id)}</strong></td>
      <td>${escapeHtml(order.customer)}</td>
      <td>${money(order.total)}</td>
      <td><span class="status ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
    </tr>
  `).join("") || emptyRow(4, "No orders yet.");

  // Rank products by units sold in non-cancelled orders; fall back to catalogue order.
  const sold = {};
  orders.filter(order => order && order.status !== "Cancelled").forEach(order => {
    (Array.isArray(order.products) ? order.products : []).forEach(item => {
      const key = String(item.name || "").trim().toLowerCase();
      if (key) sold[key] = (sold[key] || 0) + (Number(item.quantity) || 1);
    });
  });
  const unitsFor = product => Math.max(
    sold[String(product.name || "").trim().toLowerCase()] || 0,
    sold[String(product.cartName || "").trim().toLowerCase()] || 0
  );
  const ranked = products.map(product => ({ product, units: unitsFor(product) }))
    .sort((a, b) => b.units - a.units);
  const hasSales = ranked.some(entry => entry.units > 0);
  const top = (hasSales ? ranked.filter(entry => entry.units > 0) : ranked).slice(0, 5);

  document.getElementById("popular-products").innerHTML = top.map(({ product, units }) => `
    <div class="product-mini">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
      <div>
        <strong>${escapeHtml(product.name)}</strong>
        <span>${escapeHtml(product.category)} · ${money(product.price)}${hasSales ? ` · ${units} sold` : ""}</span>
      </div>
    </div>
  `).join("") || '<div class="empty">No products yet.</div>';
}

// Table helpers
function emptyRow(columns, text) {
  return `<tr><td colspan="${columns}" class="empty">${escapeHtml(text)}</td></tr>`;
}

// Orders
function renderOrders() {
  const filter = document.getElementById("order-filter").value;
  const query = document.getElementById("order-search").value.trim().toLowerCase();

  const filtered = orders.filter(order => order &&
    (filter === "all" || order.status === filter) &&
    `${order.id || ""} ${order.customer || ""} ${order.email || ""}`.toLowerCase().includes(query)
  );

  document.getElementById("orders-table").innerHTML = filtered.map(order => `
    <tr>
      <td><strong>${escapeHtml(order.id)}</strong></td>
      <td>
        ${escapeHtml(order.customer || "Customer")}
        <small class="muted-cell">${escapeHtml(order.email || "")}</small>
        ${order.address ? `<small class="muted-cell">Delivery: ${escapeHtml(order.address)}</small>` : ""}
        ${order.createdAt ? `<small class="muted-cell">Placed: ${escapeHtml(new Date(order.createdAt).toLocaleString())}</small>` : ""}
        ${order.paymentMethod ? `<small class="muted-cell">Payment: ${escapeHtml(order.paymentMethod)}</small>` : ""}
      </td>
      <td>
        ${(Array.isArray(order.products) ? order.products.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0) : Number(order.items)) || 0}
        ${Array.isArray(order.products) && order.products.length
          ? `<small class="muted-cell">${order.products.map(item => `${escapeHtml(item.name)} × ${Number(item.quantity) || 1}`).join(", ")}</small>`
          : ""}
      </td>
      <td>${money(order.total)}</td>
      <td><span class="status ${escapeHtml(order.status)}">${escapeHtml(order.status)}</span></td>
      <td>
        <select class="order-status" data-id="${escapeHtml(order.id)}">
          ${["Pending", "Preparing", "Ready", "Delivered", "Cancelled"].map(status =>
            `<option ${order.status === status ? "selected" : ""}>${status}</option>`
          ).join("")}
        </select>
      </td>
    </tr>
  `).join("") || emptyRow(6, "No matching orders.");

  document.querySelectorAll(".order-status").forEach(select => {
    select.addEventListener("change", async event => {
      const order = orders.find(item => item.id === event.target.dataset.id);
      if (!order) return;
      const previousStatus = order.status;
      const nextStatus = event.target.value;
      try {
        await window.foodHubApi.put(`/api/orders/${encodeURIComponent(order.id)}/status`, { status: nextStatus });
        order.status = nextStatus;
        renderAll();
        toast(`Order ${order.id} is now ${order.status}.`);
      } catch (err) {
        event.target.value = previousStatus;
        toast(err.message || "Could not update order status.");
      }
    });
  });
}

// Products
function renderProducts() {
  if (!Array.isArray(products)) products = [];
  document.getElementById("products-table").innerHTML = products.map(product => `
    <tr>
      <td>
        <div class="product-mini">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.description || "")}</span>
          </div>
        </div>
      </td>
      <td>${escapeHtml(product.category)}</td>
      <td>${money(product.price)}</td>
      <td>
        <span class="availability ${product.available ? "available" : "unavailable"}">
          ${product.available ? "Available" : "Unavailable"}
        </span>
      </td>
      <td>
        <button class="action-btn edit-product" data-id="${escapeHtml(product.id)}" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="action-btn toggle-product" data-id="${escapeHtml(product.id)}" title="Toggle availability">
          <i class="fa-solid fa-power-off"></i>
        </button>
        <button class="action-btn delete-product" data-id="${escapeHtml(product.id)}" title="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join("") || emptyRow(5, "No products yet.");

  document.querySelectorAll(".edit-product").forEach(button => {
    button.addEventListener("click", () => openProductModal(button.dataset.id));
  });

  document.querySelectorAll(".toggle-product").forEach(button => {
    button.addEventListener("click", async () => {
      const product = products.find(item => item.id === button.dataset.id);
      if (!product) return;
      try {
        await updateProduct(product.id, { available: !product.available });
        await reloadAll();
        toast(`${product.name} is now ${!product.available ? "available" : "unavailable"}.`);
      } catch (err) {
        toast(err.message || "Could not update product.");
      }
    });
  });

  document.querySelectorAll(".delete-product").forEach(button => {
    button.addEventListener("click", async () => {
      const product = products.find(item => item.id === button.dataset.id);
      if (!product || !confirm(`Delete ${product.name}?`)) return;
      try {
        await deleteProduct(product.id);
        await reloadAll();
        toast("Product deleted.");
      } catch (err) {
        toast(err.message || "Could not delete product.");
      }
    });
  });
}

// Product modal
const modal = document.getElementById("product-modal");

function openProductModal(id) {
  const product = products.find(item => item.id === id);

  document.getElementById("product-form").reset();
  document.getElementById("product-id").value = product?.id || "";
  document.getElementById("product-modal-title").textContent = product ? "Edit product" : "Add product";

  if (product) {
    document.getElementById("product-name").value = product.name;
    document.getElementById("product-category").value = product.category;
    document.getElementById("product-price").value = product.price;
    document.getElementById("product-image").value = product.image;
    document.getElementById("product-description").value = product.description || "";
    document.getElementById("product-available").checked = product.available;
  }

  modal.hidden = false;
  document.getElementById("product-name").focus();
}

function closeModal() {
  modal.hidden = true;
}

document.getElementById("add-product").addEventListener("click", () => openProductModal());
document.getElementById("close-product-modal").addEventListener("click", closeModal);
document.getElementById("cancel-product").addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.getElementById("product-form").addEventListener("submit", async event => {
  event.preventDefault();

  const existingId = document.getElementById("product-id").value;
  const isNew = !existingId;
  const id = existingId || `product-${Date.now()}`;
  const name = document.getElementById("product-name").value.trim();

  const product = {
    id,
    name,
    cartName: name,
    category: document.getElementById("product-category").value,
    price: Number(document.getElementById("product-price").value),
    image: document.getElementById("product-image").value.trim() || "../assets/images/FoodHub-Tile.png",
    description: document.getElementById("product-description").value.trim(),
    available: document.getElementById("product-available").checked
  };

  try {
    if (isNew) {
      await createProduct(product);
    } else {
      await updateProduct(id, product);
    }
    await reloadAll();
    closeModal();
    toast(isNew ? "Product added." : "Product updated.");
  } catch (err) {
    alert(err.message || "Could not save product.");
  }
});

// Customers: real registrations from the database.
function renderCustomers() {
  const search = (document.getElementById("customer-search")?.value || "").trim().toLowerCase();
  const filtered = customers.filter(customer =>
    `${customer.name} ${customer.email} ${customer.phone} ${customer.address}`.toLowerCase().includes(search)
  );

  document.getElementById("customers-table").innerHTML = filtered.map(customer => {
    const customerOrders = orders.filter(order => String(order.email || "").trim().toLowerCase() === customer.email.toLowerCase());
    const spent = customerOrders.filter(order => order.status !== "Cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);
    const registered = customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—";

    return `
      <tr>
        <td><strong>${escapeHtml(customer.name)}</strong></td>
        <td>${escapeHtml(customer.email)}</td>
        <td>${escapeHtml(customer.phone || "—")}</td>
        <td>${escapeHtml(customer.address || "—")}</td>
        <td>${escapeHtml(registered)}</td>
        <td>${customerOrders.length}</td>
        <td>${money(spent)}</td>
        <td class="customer-actions">
          <button type="button" class="action-btn edit-customer" data-id="${customer.id}" title="Edit customer"><i class="fa-solid fa-pen"></i></button>
          <button type="button" class="action-btn delete-customer" data-id="${customer.id}" title="Delete customer"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join("") || emptyRow(8, "No registered customers match this search.");

  document.querySelectorAll(".edit-customer").forEach(button => {
    button.addEventListener("click", async () => {
      const customer = customers.find(c => String(c.id) === button.dataset.id);
      if (!customer) return;
      const name = prompt("Customer full name:", customer.name || "");
      if (name === null) return;
      const phone = prompt("Phone number:", customer.phone || "");
      if (phone === null) return;
      const address = prompt("Delivery address:", customer.address || "");
      if (address === null) return;
      try {
        await window.foodHubApi.put(`/api/admin/customers/${customer.id}`, {
          name: name.trim(), phone: phone.trim(), address: address.trim()
        });
        await reloadAll();
        toast("Customer details updated.");
      } catch (err) {
        toast(err.message || "Could not update customer.");
      }
    });
  });

  document.querySelectorAll(".delete-customer").forEach(button => {
    button.addEventListener("click", async () => {
      const customer = customers.find(c => String(c.id) === button.dataset.id);
      if (!customer) return;
      if (!confirm(`Delete the customer account for ${customer.email}? Their existing orders will be retained.`)) return;
      try {
        await window.foodHubApi.del(`/api/admin/customers/${customer.id}`);
        await reloadAll();
        toast("Customer account deleted.");
      } catch (err) {
        toast(err.message || "Could not delete customer.");
      }
    });
  });
}

// Reviews
function renderReviews() {
  document.getElementById("reviews-grid").innerHTML = reviews.map(review => {
    const rating = Math.round(Number(review.rating));
    const hasRating = rating >= 1 && rating <= 5;
    const date = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "";
    return `
    <article class="review-card">
      <div class="stars">
        ${hasRating ? `${"★".repeat(rating)}${"☆".repeat(5 - rating)}` : '<span class="muted-cell">No rating</span>'}
      </div>
      <p>"${escapeHtml(review.text)}"</p>
      <span class="review-author">${escapeHtml(review.name || "Customer")}${date ? ` · ${escapeHtml(date)}` : ""}</span>
    </article>`;
  }).join("") || '<div class="empty">No reviews yet.</div>';
}

// Search and reset
const orderFilter = document.getElementById("order-filter");
const orderSearch = document.getElementById("order-search");

if (orderFilter) orderFilter.addEventListener("change", renderOrders);
if (orderSearch) orderSearch.addEventListener("input", renderOrders);
const customerSearch = document.getElementById("customer-search");
if (customerSearch) customerSearch.addEventListener("input", renderCustomers);

// Toast message
function toast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);

  setTimeout(() => node.remove(), 2200);
}

// Render everything
function renderAll() {
  renderDashboard();
  renderOrders();
  renderProducts();
  renderCustomers();
  renderReviews();
}

// Re-fetch everything from the API and redraw.
async function reloadAll() {
  await loadAll();
  renderAll();
}

reloadAll();

// Refresh when returning to the dashboard tab.
window.addEventListener("focus", reloadAll);

}
