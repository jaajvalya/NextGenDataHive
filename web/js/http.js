/**
 * Shared browser HTTP helpers for every DataHive feature module.
 *
 * Loaded first (see main.html). Feature scripts call window.DataHiveHttp
 * instead of each re-implementing apiBase / headers / escapeHtml.
 */
(function (global) {
  "use strict";

  function apiBase() {
    if (global.DATAHIVE_CONNECTOR_API) {
      return String(global.DATAHIVE_CONNECTOR_API).replace(/\/$/, "");
    }
    var host = "127.0.0.1";
    if (global.location && global.location.hostname) {
      host = global.location.hostname;
    }
    return "http://" + host + ":5055";
  }

  function userName() {
    var el = document.getElementById("userNm");
    var name = el && el.textContent ? el.textContent.trim() : "";
    return name || "Admin";
  }

  function userRole() {
    if (typeof global.getDataHiveUserRole === "function") {
      return global.getDataHiveUserRole() || "admin";
    }
    var name = userName().toLowerCase();
    if (name === "admin" || name === "administrator") return "admin";
    return "editor";
  }

  function headers(extra) {
    var h = {
      "X-DataHive-User": userName(),
      "X-DataHive-Role": userRole(),
      "Content-Type": "application/json",
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        h[k] = extra[k];
      });
    }
    return h;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function detailFromResponse(text, status) {
    var detail = text || "HTTP " + status;
    try {
      var parsed = JSON.parse(text);
      if (parsed && parsed.detail !== undefined) {
        detail =
          typeof parsed.detail === "string"
            ? parsed.detail
            : JSON.stringify(parsed.detail);
      }
    } catch (_e) {
      /* keep raw text */
    }
    return detail;
  }

  async function fetchJson(path, options) {
    var opts = options || {};
    var res = await fetch(apiBase() + path, {
      method: opts.method || "GET",
      headers: headers(opts.headers),
      body: opts.body !== undefined ? opts.body : undefined,
      cache: opts.cache,
    });
    var text = await res.text();
    if (!res.ok) {
      var detail = detailFromResponse(text, res.status);
      if (res.status === 404 && String(path).indexOf("/api/") === 0) {
        detail =
          "Connector API route not found (404). Restart the API: python -m api";
      }
      var err = new Error(detail);
      err.httpStatus = res.status;
      throw err;
    }
    return text ? JSON.parse(text) : {};
  }

  async function postJson(path, body, options) {
    var opts = options || {};
    return fetchJson(path, {
      method: "POST",
      headers: opts.headers,
      body: JSON.stringify(body === undefined ? {} : body),
      cache: opts.cache,
    });
  }

  global.DataHiveHttp = {
    apiBase: apiBase,
    userName: userName,
    userRole: userRole,
    headers: headers,
    escapeHtml: escapeHtml,
    fetchJson: fetchJson,
    postJson: postJson,
  };
})(window);
