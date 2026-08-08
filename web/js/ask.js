/**
 * Ask Aura tab — natural-language querying.
 *
 * Posts a question to /api/ask, which picks a connector, generates read-only SQL
 * and runs it. The tab hides itself when no model provider is configured.
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

  function userHeader() {
    var el = document.getElementById("userNm");
    var name = el && el.textContent ? el.textContent.trim() : "";
    return name || "Admin";
  }

  function headers() {
    return { "X-DataHive-User": userHeader(), "Content-Type": "application/json" };
  }

  async function postJson(path, body) {
    var res = await fetch(apiBase() + path, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    var text = await res.text();
    var parsed = null;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch (_e) {
      parsed = null;
    }
    if (!res.ok) {
      var detail = (parsed && parsed.detail) || text || "HTTP " + res.status;
      if (typeof detail !== "string") detail = JSON.stringify(detail);
      var err = new Error(detail);
      err.httpStatus = res.status;
      throw err;
    }
    return parsed || {};
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  var state = {
    bound: false,
    health: null,
    connectorsLoaded: false,
    last: null,
    busy: false,
  };

  var SUGGESTIONS = [
    "How many rows are in each table?",
    "Show the 10 most recent orders",
    "Which customers have the highest total order value?",
  ];

  function setStatus(msg) {
    var el = $("#askStatus");
    if (el) el.textContent = msg || "";
  }

  function showError(msg) {
    var el = $("#askError");
    if (!el) return;
    if (!msg) {
      el.classList.add("hidden");
      el.textContent = "";
      return;
    }
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function setBusy(busy) {
    state.busy = busy;
    ["#askRunBtn", "#askPreviewBtn"].forEach(function (sel) {
      var btn = $(sel);
      if (btn) btn.disabled = busy;
    });
  }

  function renderSuggestions() {
    var wrap = $("#askSuggestions");
    if (!wrap || wrap.childElementCount) return;
    SUGGESTIONS.forEach(function (text) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "ask-chip";
      chip.textContent = text;
      chip.addEventListener("click", function () {
        var input = $("#askQuestion");
        if (input) {
          input.value = text;
          input.focus();
        }
      });
      wrap.appendChild(chip);
    });
  }

  function renderSources(payload) {
    var wrap = $("#askSources");
    if (!wrap) return;
    var sources = payload.sources || [];
    if (!sources.length) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML =
      '<span class="ask-sources-label">Sources</span>' +
      sources
        .map(function (s) {
          return (
            '<span class="ask-source-chip" title="' +
            escapeHtml((s.connector_name || "") + " · " + (s.platform || "")) +
            '">' +
            escapeHtml(s.fqn || s.table || "") +
            "</span>"
          );
        })
        .join("");
  }

  function renderMeta(payload) {
    var el = $("#askMeta");
    if (!el) return;
    var bits = [];
    if (payload.connector_name) {
      bits.push(escapeHtml(payload.connector_name));
    }
    if (payload.platform) bits.push(escapeHtml(payload.platform));
    if (payload.confidence) {
      bits.push(
        '<span class="ask-confidence ' +
          escapeHtml(payload.confidence) +
          '">' +
          escapeHtml(payload.confidence) +
          " confidence</span>"
      );
    }
    if (typeof payload.row_count === "number") {
      bits.push(payload.row_count + (payload.row_count === 1 ? " row" : " rows"));
    }
    el.innerHTML = bits.join(' <span class="ask-dot">·</span> ');
  }

  function renderAssumptions(payload) {
    var el = $("#askAssumptions");
    if (!el) return;
    var items = (payload.assumptions || []).concat(payload.notes || []);
    if (!items.length) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    el.innerHTML = items
      .map(function (a) {
        return "<li>" + escapeHtml(a) + "</li>";
      })
      .join("");
    el.classList.remove("hidden");
  }

  function renderResults(payload) {
    var wrap = $("#askResults");
    if (!wrap) return;
    if (!payload.executed) {
      wrap.innerHTML =
        '<div class="sql-results-empty">SQL generated but not run. Review it above, then press Ask.</div>';
      return;
    }
    var columns = payload.columns || [];
    if (!columns.length) {
      wrap.innerHTML = '<div class="sql-results-empty">The query returned no columns.</div>';
      return;
    }
    var thead =
      "<thead><tr>" +
      columns
        .map(function (c) {
          return "<th>" + escapeHtml(c) + "</th>";
        })
        .join("") +
      "</tr></thead>";
    var rows = (payload.rows || []).map(function (row) {
      return (
        "<tr>" +
        row
          .map(function (cell) {
            if (cell === null || cell === undefined) return '<td class="null">NULL</td>';
            return "<td>" + escapeHtml(cell) + "</td>";
          })
          .join("") +
        "</tr>"
      );
    });
    var note = payload.truncated
      ? '<p class="sql-results-note">Showing the first ' +
        payload.max_rows +
        " rows (result truncated).</p>"
      : "";
    wrap.innerHTML =
      note +
      '<div class="sql-results-scroll"><table class="sql-results-table">' +
      thead +
      "<tbody>" +
      rows.join("") +
      "</tbody></table></div>";
  }

  function render(payload) {
    state.last = payload;
    var card = $("#askAnswerCard");
    if (card) card.classList.remove("hidden");

    var answerEl = $("#askAnswer");
    if (answerEl) {
      answerEl.textContent =
        payload.answer || payload.explanation || payload.selection_reason || "";
    }
    var sqlEl = $("#askSqlCode");
    if (sqlEl) sqlEl.textContent = payload.sql || "";
    var sqlBlock = $("#askSqlBlock");
    if (sqlBlock) sqlBlock.open = !payload.executed;

    renderMeta(payload);
    renderSources(payload);
    renderAssumptions(payload);
    renderResults(payload);
  }

  async function submit(execute) {
    if (state.busy) return;
    var input = $("#askQuestion");
    var question = input ? input.value.trim() : "";
    if (question.length < 3) {
      showError("Type a question first.");
      return;
    }
    showError("");
    setBusy(true);
    setStatus(execute ? "Thinking…" : "Generating SQL…");

    var connectorSel = $("#askConnectorSelect");
    var body = {
      question: question,
      connector_id: connectorSel && connectorSel.value ? connectorSel.value : null,
    };

    try {
      if (typeof global.ensureDataHiveConnectorApi === "function") {
        var apiOk = await global.ensureDataHiveConnectorApi();
        if (!apiOk) {
          throw new Error(
            "Connector API is unavailable. Reload the page, or run: python -m api"
          );
        }
      }
      var payload = execute
        ? await postJson("/api/ask", body)
        : await postJson("/api/ask/sql", body);
      render(payload);
      setStatus(execute ? "Done." : "SQL ready — review before running.");
    } catch (err) {
      var msg = (err && err.message) || String(err);
      if (msg === "Failed to fetch" || msg.indexOf("NetworkError") !== -1) {
        msg = "Cannot reach the connector API at " + apiBase() + ". Start it with: python -m api";
      }
      showError(msg);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function loadConnectorOptions() {
    var sel = $("#askConnectorSelect");
    if (!sel || state.connectorsLoaded || typeof global.DataHiveAssets === "undefined") return;
    try {
      var data = await global.DataHiveAssets.connectors();
      var items = (data && data.items) || [];
      sel.innerHTML = '<option value="">Auto — pick the best source</option>';
      items
        .filter(function (item) {
          return item.structure_supported;
        })
        .forEach(function (item) {
          var opt = document.createElement("option");
          opt.value = item.id;
          opt.textContent = item.display_name + " (" + (item.platform || item.cloud) + ")";
          sel.appendChild(opt);
        });
      state.connectorsLoaded = true;
    } catch (_e) {
      /* Auto still works without the list. */
    }
  }

  function bind() {
    if (state.bound) return;
    state.bound = true;

    var runBtn = $("#askRunBtn");
    if (runBtn) runBtn.addEventListener("click", function () { submit(true); });

    var previewBtn = $("#askPreviewBtn");
    if (previewBtn) previewBtn.addEventListener("click", function () { submit(false); });

    var input = $("#askQuestion");
    if (input) {
      input.addEventListener("keydown", function (e) {
        // Enter sends; Shift+Enter adds a line.
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit(true);
        }
      });
    }

    var openBtn = $("#askOpenSqlBtn");
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        if (!state.last || !state.last.sql) return;
        if (global.DataHiveSqlExplorer && global.DataHiveSqlExplorer.openWithSql) {
          global.DataHiveSqlExplorer.openWithSql(state.last.sql, state.last.connector_id);
        }
      });
    }

    var copyBtn = $("#askCopySqlBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", async function () {
        if (!state.last || !state.last.sql) return;
        try {
          await navigator.clipboard.writeText(state.last.sql);
          setStatus("SQL copied.");
        } catch (_e) {
          setStatus("Could not copy — select the SQL manually.");
        }
      });
    }
  }

  /** Show the nav entry only when a model provider is configured. */
  async function checkHealth() {
    var nav = document.getElementById("navAsk");
    try {
      var res = await fetch(apiBase() + "/api/ask/health", {
        headers: headers(),
        cache: "no-store",
      });
      state.health = res.ok ? await res.json() : { enabled: false };
    } catch (_e) {
      state.health = { enabled: false };
    }
    if (nav) nav.hidden = !state.health.enabled;
    return state.health;
  }

  async function init() {
    bind();
    renderSuggestions();
    var health = state.health || (await checkHealth());
    if (health && health.enabled && health.model) {
      setStatus("Using " + health.provider + " · " + health.model);
    }
    loadConnectorOptions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkHealth);
  } else {
    checkHealth();
  }

  global.DataHiveAsk = {
    init: init,
    checkHealth: checkHealth,
  };
})(window);
