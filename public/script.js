"use strict";

(function () {
  const BASE = "/jokebook";

  window.addEventListener("load", init);

  function init() {
    loadRandom();
    id("btn-random").addEventListener("click", loadRandom);
    id("btn-load-cats").addEventListener("click", loadCategories);
    id("btn-get-cat").addEventListener("click", () => {
      const cat = id("cat-input").value.trim();
      const lim = id("limit-input").value.trim();
      if (cat) fetchCategory(cat, lim || undefined);
    });
    id("add-form").addEventListener("submit", addJoke);
  }

  // GET /jokebook/random
  async function loadRandom() {
    try {
      const r = await fetch(`${BASE}/random`);
      const data = await r.json();
      id("random").innerHTML = data.error
        ? `<div class="card">${data.error}</div>`
        : `<div class="card"><b>[${escapeHtml(data.category)}]</b> ${escapeHtml(data.setup)}<br>${escapeHtml(data.delivery)}</div>`;
    } catch (e) {
      id("random").innerHTML = `<div class="card">Failed to load random joke.</div>`;
      console.error(e);
    }
  }

  // GET /jokebook/categories
  async function loadCategories() {
    try {
      const r = await fetch(`${BASE}/categories`);
      const data = await r.json();
      const ul = id("cat-list");
      ul.innerHTML = "";
      (data.categories || []).forEach(cat => {
        const li = document.createElement("li");
        li.textContent = cat;
        li.addEventListener("click", () => fetchCategory(cat));
        ul.appendChild(li);
      });
    } catch (e) {
      console.error(e);
      alert("Could not load categories.");
    }
  }

  // GET /jokebook/category/:category?limit=n
  async function fetchCategory(cat, limit) {
    try {
      const url = new URL(`${BASE}/category/${encodeURIComponent(cat)}`, window.location.origin);
      if (limit) url.searchParams.set("limit", limit);
      const r = await fetch(url);
      const data = await r.json();
      const out = id("cat-results");

      if (!r.ok || data.error) {
        out.innerHTML = `<div class="card">${data.error || "Failed to load category."}</div>`;
        return;
      }

      out.innerHTML =
        `<h3>${escapeHtml(data.category)} (${data.count})</h3>` +
        data.jokes
          .map(
            j =>
              `<div class="card"><b>${escapeHtml(j.setup)}</b><br>${escapeHtml(j.delivery)}</div>`
          )
          .join("");
    } catch (e) {
      console.error(e);
      id("cat-results").innerHTML = `<div class="card">Error loading category.</div>`;
    }
  }

  // POST /jokebook/joke/add
  async function addJoke(ev) {
    ev.preventDefault();
    const form = ev.target;

    const payload = {
      category: form.category.value.trim(),
      setup: form.setup.value.trim(),
      delivery: form.delivery.value.trim()
    };

    if (!payload.category || !payload.setup || !payload.delivery) {
      id("add-out").innerHTML = `<div class="card">All fields are required.</div>`;
      return;
    }

    try {
      const r = await fetch(`${BASE}/joke/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await r.json();

      if (!r.ok || data.error) {
        id("add-out").innerHTML = `<div class="card">${data.error || "Failed to add joke."}</div>`;
        return;
      }

      id("add-out").innerHTML =
        `<div class="card">Added. Updated '${escapeHtml(payload.category)}' has ${data.list.length} jokes.</div>`;

      // show updated list, keep category in the input for convenience
      id("cat-input").value = payload.category;
      await fetchCategory(payload.category);
      form.reset();
    } catch (e) {
      console.error(e);
      id("add-out").innerHTML = `<div class="card">Network error adding joke.</div>`;
    }
  }

  // helpers
  function id(x) { return document.getElementById(x); }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
