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
      orders = data.orders || [];
    } catch (_) {
      // leave orders empty on error
    }
    container.innerHTML = orders.length ? orders.map(order => `<div class="order-row"><strong>${escapeHtml(order.id)} · R${Number(order.total || 0).toFixed(2)}</strong><small>${new Date(order.createdAt || Date.now()).toLocaleString()}</small><br><span class="status">${escapeHtml(order.status || "Pending")}</span><p>${(order.products || []).map(item => `${escapeHtml(item.name)} × ${Number(item.quantity || 1)}`).join(", ")}</p></div>`).join("") : "<p>No orders yet.</p>";
  }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch])); }
});
