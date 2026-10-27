// Loads and saves the signed-in customer profile.
// Loads the customer profile when the page opens.
document.addEventListener("DOMContentLoaded", async function () {
  const user = await window.foodHubSession.get();
  if (!user || user.role !== "customer") {
    sessionStorage.setItem("foodhubReturnTo", window.location.href);
    alert("Please log in to manage your account.");
    window.location.replace("../auth/login.html");
    return;
  }

  let profile;
  try {
    profile = await window.foodHubApi.get("/api/profile");
  } catch (err) {
    alert("We could not find your account. Please log in again.");
    window.location.replace("../auth/login.html");
    return;
  }

  const nameInput = document.getElementById("profile-name");
  const phoneInput = document.getElementById("profile-phone");
  const addressInput = document.getElementById("profile-address");
  const message = document.getElementById("profile-message");
  document.getElementById("profile-email").textContent = profile.email;
  nameInput.value = profile.name || profile.email.split("@")[0];
  phoneInput.value = profile.phone || "";
  addressInput.value = profile.address || "";
  setAvatar(nameInput.value);
  nameInput.addEventListener("input", () => setAvatar(nameInput.value));

  document.getElementById("profile-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    try {
      await window.foodHubApi.put("/api/profile", {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        address: addressInput.value.trim(),
      });
      message.textContent = "Profile saved successfully.";
    } catch (err) {
      message.textContent = err.message || "Could not save your profile.";
    }
  });

  document.getElementById("password-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    const current = document.getElementById("current-password").value;
    const next = document.getElementById("new-password").value;
    const confirm = document.getElementById("confirm-new-password").value;
    if (next !== confirm) { message.textContent = "The new passwords do not match."; return; }
    try {
      await window.foodHubApi.put("/api/profile/password", { currentPassword: current, newPassword: next });
      document.getElementById("password-form").reset();
      message.textContent = "Password updated successfully.";
    } catch (err) {
      message.textContent = err.message || "Could not update your password.";
    }
  });

  renderOrders();
  renderFavourites();
  document.getElementById("profile-logout").addEventListener("click", function () {
    window.foodHubSession.signOut("../home/index.html");
  });

  function setAvatar(name) {
    document.getElementById("profile-avatar").textContent =
      (name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("") || "FH").toUpperCase();
  }

  async function renderOrders() {
    const container = document.getElementById("my-orders");
    let orders = [];
    try {
      const data = await window.foodHubApi.get("/api/orders/mine");
      orders = Array.isArray(data.orders) ? data.orders : [];
    } catch (_) {
      // leave orders empty on error
    }
    container.replaceChildren();
    if (!orders.length) {
      const empty = document.createElement("p");
      empty.textContent = "No orders yet.";
      container.appendChild(empty);
      return;
    }
    orders.forEach(order => {
      const row = document.createElement("div");
      row.className = "order-row";
      const heading = document.createElement("strong");
      heading.textContent = `${String(order.id || "Order")} · R${(Number(order.total) || 0).toFixed(2)}`;
      const date = document.createElement("small");
      const parsedDate = new Date(order.createdAt || Date.now());
      date.textContent = Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toLocaleString();
      const lineBreak = document.createElement("br");
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = String(order.status || "Pending");
      const items = document.createElement("p");
      items.textContent = (Array.isArray(order.products) ? order.products : [])
        .filter(item => item && typeof item === "object")
        .map(item => `${String(item.name || "Food item")} × ${Math.max(1, Number(item.quantity) || 1)}`)
        .join(", ");
      row.append(heading, date, lineBreak, status, items);
      container.appendChild(row);
    });
  }

  function renderFavourites() {
    const list = document.getElementById("my-favourites");
    if (!list) return;
    list.replaceChildren();
    let favourites = [];
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      favourites = Array.isArray(stored) ? stored : [];
    } catch (_) { favourites = []; }
    if (!favourites.length) {
      const empty = document.createElement("li");
      empty.textContent = "No favourites yet. Browse the menu and tap a heart to save a dish.";
      list.appendChild(empty);
      return;
    }
    favourites.forEach((item, index) => {
      const li = document.createElement("li");
      li.className = "favourite-row";
      const title = document.createElement("strong");
      title.textContent = String(item.title || item.name || "Food item");
      const price = document.createElement("span");
      price.textContent = `R${(Number(item.price) || 0).toFixed(2)}`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        let current = [];
        try {
          const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
          current = Array.isArray(stored) ? stored : [];
        } catch (_) { current = []; }
        current.splice(index, 1);
        localStorage.setItem("favorites", JSON.stringify(current));
        renderFavourites();
      });
      li.append(title, price, remove);
      list.appendChild(li);
    });
  }

});
