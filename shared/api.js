// Shared fetch wrapper for the FoodHub API.
// Auth is a server-side httpOnly session cookie (not readable or forgeable
// from page JS), so every call sends credentials and the server decides
// who's signed in / what role they have.
(function () {
  async function request(path, options = {}) {
    const res = await fetch(path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      /* empty body is fine for some endpoints */
    }
    if (!res.ok) {
      const error = new Error((data && data.error) || `Request failed (${res.status})`);
      error.status = res.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  window.foodHubApi = {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body || {}) }),
    put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body || {}) }),
    del: (path) => request(path, { method: "DELETE" }),
  };
})();
