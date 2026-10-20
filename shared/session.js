// Caches the current signed-in user (if any) for this page load. Requires
// shared/api.js to be loaded first.
(function () {
  let cached = null;
  let pending = null;

  async function fetchUser() {
    try {
      const data = await window.foodHubApi.get("/api/auth/me");
      return data.user || null;
    } catch (_) {
      return null;
    }
  }

  window.foodHubSession = {
    // Synchronous best-effort read of whatever was last fetched (null if the
    // first /api/auth/me call hasn't resolved yet, or no one's signed in).
    // Only use this for instant UI decisions like a click guard; anything
    // that actually matters is still re-checked by the server.
    getCached() {
      return cached;
    },
    // Returns the cached user after the first call; pass force:true to re-check.
    async get(force) {
      if (!force && cached !== null) return cached;
      if (!pending) pending = fetchUser().then((u) => { cached = u; pending = null; return u; });
      return pending;
    },
    async isCustomer() {
      const user = await this.get();
      return !!user && user.role === "customer";
    },
    async isAdmin() {
      const user = await this.get();
      return !!user && user.role === "admin";
    },
    async signOut(redirectTo) {
      try {
        await window.foodHubApi.post("/api/auth/logout");
      } catch (_) {}
      cached = null;
      window.location.href = redirectTo || "../home/index.html";
    },
    invalidate() {
      cached = null;
    },
  };
})();
