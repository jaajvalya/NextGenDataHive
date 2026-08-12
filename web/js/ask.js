/**
 * Ask Aura tab — natural-language querying.
 *
 * Posts a question to /api/ask, which picks a connector, generates read-only SQL
 * and runs it. The tab hides itself when no model provider is configured.
 */
(function (global) {
  "use strict";

  // Fall back if http.js failed to load so the tab still appears.
  var http = global.DataHiveHttp || {
    apiBase: function () {
      var host =
        (global.location && global.location.hostname) || "127.0.0.1";
      return "http://" + host + ":5055";
    },
    escapeHtml: function (s) {
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },
    headers: function () {
      return { "Content-Type": "application/json", "X-DataHive-User": "Admin" };
    },
    postJson: async function (path, body) {
      var res = await fetch(this.apiBase() + path, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(body || {}),
      });
      var text = await res.text();
      var parsed = text ? JSON.parse(text) : {};
      if (!res.ok) {
        var err = new Error(
          (parsed && parsed.detail) || text || "HTTP " + res.status
        );
        err.httpStatus = res.status;
        throw err;
      }
      return parsed;
    },
  };
  var apiBase = http.apiBase.bind(http);
  var escapeHtml = http.escapeHtml;
  var postJson = http.postJson.bind(http);

  function $(sel) {
    return document.querySelector(sel);
  }

  function refreshIcons() {
    if (global.lucide && typeof global.lucide.createIcons === "function") {
      global.lucide.createIcons({
        attrs: { "stroke-width": "1.75", "aria-hidden": "true" },
      });
    }
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
    "Sum of orders per quarter from RAW and chart it",
    "Which customers have the highest total order value?",
    "Join customers and orders: top 10 customers by order count",
  ];

  var CHART_PALETTE = [
    "#ff671f",
    "#0b3a6e",
    "#2a9d8f",
    "#e9c46a",
    "#e76f51",
    "#264653",
    "#457b9d",
    "#a8dadc",
  ];

  var chartState = {
    points: null,
    type: "bar",
    title: "",
    labelCol: "",
    valueCol: "",
  };

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

  function wantsChart(question) {
    return /\b(chart|graph|plot|visuali[sz]e|visual|dashboard|bar chart|line chart|pie)\b/i.test(
      question || ""
    );
  }

  function isNumericCell(v) {
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "number" && isFinite(v)) return true;
    if (typeof v === "boolean") return false;
    var s = String(v).trim().replace(/,/g, "");
    if (!s || /[a-zA-Z]/.test(s.replace(/[eE+\-.]/g, ""))) return false;
    var n = Number(s);
    return isFinite(n);
  }

  function toNumber(v) {
    if (typeof v === "number") return v;
    return Number(String(v).trim().replace(/,/g, ""));
  }

  function looksLikePeriod(name, sample) {
    var n = String(name || "").toLowerCase();
    if (/\b(quarter|qtr|month|year|week|date|period|day|time)\b/.test(n)) return true;
    var s = String(sample == null ? "" : sample);
    return /^\d{4}([-Q/\s]\d{1,2})?$/i.test(s) || /^Q[1-4]/i.test(s) || /^\d{4}-Q[1-4]$/i.test(s);
  }

  function columnStats(columns, rows) {
    return columns.map(function (name, idx) {
      var values = rows
        .map(function (r) {
          return r[idx];
        })
        .filter(function (v) {
          return v !== null && v !== undefined && v !== "";
        });
      var numericCount = values.filter(isNumericCell).length;
      var unique = {};
      values.forEach(function (v) {
        unique[String(v)] = true;
      });
      return {
        name: name,
        idx: idx,
        numericRatio: values.length ? numericCount / values.length : 0,
        uniqueCount: Object.keys(unique).length,
        sample: values[0],
        isPeriod: looksLikePeriod(name, values[0]),
      };
    });
  }

  function inferChartSpec(question, columns, rows) {
    if (!columns || !columns.length || !rows || !rows.length) return null;
    if (rows.length > 40) return null;
    var stats = columnStats(columns, rows);
    var valueCols = stats
      .filter(function (c) {
        return c.numericRatio >= 0.8;
      })
      .sort(function (a, b) {
        return b.numericRatio - a.numericRatio;
      });
    if (!valueCols.length) return null;

    var labelCols = stats
      .filter(function (c) {
        return c.idx !== valueCols[0].idx && (c.numericRatio < 0.8 || c.isPeriod);
      })
      .sort(function (a, b) {
        if (a.isPeriod !== b.isPeriod) return a.isPeriod ? -1 : 1;
        return a.uniqueCount - b.uniqueCount;
      });
    if (!labelCols.length && stats.length >= 2) {
      labelCols = stats.filter(function (c) {
        return c.idx !== valueCols[0].idx;
      });
    }
    if (!labelCols.length) return null;

    var label = labelCols[0];
    var value = valueCols[0];
    var points = rows
      .map(function (row) {
        var rawLabel = row[label.idx];
        var rawValue = row[value.idx];
        if (!isNumericCell(rawValue)) return null;
        return {
          label: rawLabel == null || rawLabel === "" ? "(blank)" : String(rawLabel),
          value: toNumber(rawValue),
        };
      })
      .filter(Boolean);
    if (points.length < 1) return null;

    var force = wantsChart(question);
    var aggregateLike =
      points.length <= 24 &&
      label.uniqueCount <= 24 &&
      (label.isPeriod ||
        /\b(per|by|group|quarter|month|year|category|channel|status|region)\b/i.test(
          question || ""
        ) ||
        valueCols.length >= 1);
    if (!force && !aggregateLike) return null;

    var type = "bar";
    if (
      label.isPeriod ||
      /\b(trend|over time|timeline|line)\b/i.test(question || "") ||
      points.length >= 6
    ) {
      type = "line";
    }
    if (/\bpie\b/i.test(question || "") && points.length <= 10) type = "pie";
    if (/\bbar\b/i.test(question || "")) type = "bar";

    return {
      type: type,
      title: value.name + " by " + label.name,
      labelCol: label.name,
      valueCol: value.name,
      points: points,
    };
  }

  function fmtChartNum(n) {
    if (!isFinite(n)) return "—";
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    if (Math.round(n) === n) return String(n);
    return n.toFixed(2);
  }

  function renderBarSvg(points) {
    var w = 640;
    var h = 260;
    var pad = { l: 44, r: 16, t: 24, b: 52 };
    var innerW = w - pad.l - pad.r;
    var innerH = h - pad.t - pad.b;
    var max = Math.max.apply(
      null,
      points.map(function (p) {
        return p.value;
      }).concat([1])
    );
    var barW = Math.min(52, innerW / points.length - 10);
    var svg =
      '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Bar chart">';
    points.forEach(function (p, i) {
      var x = pad.l + (i + 0.5) * (innerW / points.length) - barW / 2;
      var bh = (p.value / max) * innerH;
      var y = pad.t + innerH - bh;
      var color = CHART_PALETTE[i % CHART_PALETTE.length];
      svg +=
        '<rect x="' +
        x.toFixed(1) +
        '" y="' +
        y.toFixed(1) +
        '" width="' +
        Math.max(barW, 4).toFixed(1) +
        '" height="' +
        Math.max(bh, 2).toFixed(1) +
        '" rx="4" fill="' +
        color +
        '"><title>' +
        escapeHtml(p.label + ": " + p.value) +
        "</title></rect>";
      svg +=
        '<text x="' +
        (x + barW / 2).toFixed(1) +
        '" y="' +
        (y - 6).toFixed(1) +
        '" text-anchor="middle" font-size="11" font-weight="700" fill="#0b3a6e">' +
        escapeHtml(fmtChartNum(p.value)) +
        "</text>";
      svg +=
        '<text x="' +
        (x + barW / 2).toFixed(1) +
        '" y="' +
        (h - 18) +
        '" text-anchor="middle" font-size="10" fill="#8a93a3">' +
        escapeHtml(String(p.label).slice(0, 14)) +
        "</text>";
    });
    svg += "</svg>";
    return svg;
  }

  function renderLineSvg(points) {
    var w = 640;
    var h = 260;
    var pad = { l: 48, r: 16, t: 22, b: 44 };
    var innerW = w - pad.l - pad.r;
    var innerH = h - pad.t - pad.b;
    var max = Math.max.apply(
      null,
      points.map(function (p) {
        return p.value;
      }).concat([1])
    );
    var min = 0;
    var pts = points.map(function (p, i) {
      var x =
        pad.l +
        (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
      var y = pad.t + innerH - ((p.value - min) / (max - min || 1)) * innerH;
      return { x: x, y: y, p: p };
    });
    var line = pts
      .map(function (pt, i) {
        return (i ? "L" : "M") + pt.x.toFixed(1) + " " + pt.y.toFixed(1);
      })
      .join(" ");
    var area =
      line +
      " L " +
      pts[pts.length - 1].x.toFixed(1) +
      " " +
      (pad.t + innerH) +
      " L " +
      pts[0].x.toFixed(1) +
      " " +
      (pad.t + innerH) +
      " Z";
    var svg =
      '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Line chart">';
    svg +=
      '<path d="' +
      area +
      '" fill="rgba(255,103,31,0.12)" stroke="none"></path>';
    svg +=
      '<path d="' +
      line +
      '" fill="none" stroke="#ff671f" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></path>';
    pts.forEach(function (pt) {
      svg +=
        '<circle cx="' +
        pt.x.toFixed(1) +
        '" cy="' +
        pt.y.toFixed(1) +
        '" r="4" fill="#0b3a6e"><title>' +
        escapeHtml(pt.p.label + ": " + pt.p.value) +
        "</title></circle>";
      svg +=
        '<text x="' +
        pt.x.toFixed(1) +
        '" y="' +
        (h - 14) +
        '" text-anchor="middle" font-size="10" fill="#8a93a3">' +
        escapeHtml(String(pt.p.label).slice(0, 12)) +
        "</text>";
    });
    svg += "</svg>";
    return svg;
  }

  function renderPieSvg(points) {
    var w = 420;
    var h = 260;
    var cx = 130;
    var cy = 130;
    var r = 96;
    var total = points.reduce(function (s, p) {
      return s + Math.max(p.value, 0);
    }, 0) || 1;
    var angle = -Math.PI / 2;
    var svg =
      '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Pie chart">';
    points.forEach(function (p, i) {
      var slice = (Math.max(p.value, 0) / total) * Math.PI * 2;
      var a2 = angle + slice;
      var x1 = cx + r * Math.cos(angle);
      var y1 = cy + r * Math.sin(angle);
      var x2 = cx + r * Math.cos(a2);
      var y2 = cy + r * Math.sin(a2);
      var large = slice > Math.PI ? 1 : 0;
      var d =
        "M " +
        cx +
        " " +
        cy +
        " L " +
        x1.toFixed(2) +
        " " +
        y1.toFixed(2) +
        " A " +
        r +
        " " +
        r +
        " 0 " +
        large +
        " 1 " +
        x2.toFixed(2) +
        " " +
        y2.toFixed(2) +
        " Z";
      svg +=
        '<path d="' +
        d +
        '" fill="' +
        CHART_PALETTE[i % CHART_PALETTE.length] +
        '"><title>' +
        escapeHtml(p.label + ": " + p.value) +
        "</title></path>";
      angle = a2;
    });
    svg += "</svg>";
    var legend =
      '<div class="ask-chart-legend">' +
      points
        .map(function (p, i) {
          return (
            '<span><i style="background:' +
            CHART_PALETTE[i % CHART_PALETTE.length] +
            '"></i>' +
            escapeHtml(p.label) +
            " · " +
            escapeHtml(fmtChartNum(p.value)) +
            "</span>"
          );
        })
        .join("") +
      "</div>";
    return svg + legend;
  }

  function paintChart() {
    var block = $("#askChartBlock");
    var el = $("#askChart");
    var title = $("#askChartTitle");
    var hint = $("#askChartHint");
    var types = $("#askChartTypes");
    if (!block || !el) return;
    if (!chartState.points || !chartState.points.length) {
      block.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    block.classList.remove("hidden");
    if (title) title.textContent = chartState.title || "Chart";
    if (hint) {
      hint.textContent =
        chartState.labelCol +
        " → " +
        chartState.valueCol +
        " · " +
        chartState.points.length +
        " points";
    }
    if (types) {
      ["bar", "line", "pie"].forEach(function (t) {
        var btn = types.querySelector('[data-chart-type="' + t + '"]');
        if (btn) btn.classList.toggle("active", chartState.type === t);
      });
    }
    if (chartState.type === "line") el.innerHTML = renderLineSvg(chartState.points);
    else if (chartState.type === "pie") el.innerHTML = renderPieSvg(chartState.points);
    else el.innerHTML = renderBarSvg(chartState.points);
  }

  function renderChart(question, payload) {
    var block = $("#askChartBlock");
    var types = $("#askChartTypes");
    if (!payload.executed) {
      chartState.points = null;
      if (block) block.classList.add("hidden");
      return;
    }
    var spec = inferChartSpec(question, payload.columns || [], payload.rows || []);
    if (!spec) {
      chartState.points = null;
      if (block) block.classList.add("hidden");
      if (wantsChart(question)) {
        var wrap = $("#askResults");
        if (wrap && !wrap.querySelector(".ask-chart-miss")) {
          wrap.insertAdjacentHTML(
            "afterbegin",
            '<p class="sql-results-note ask-chart-miss">Could not build a chart from this result — need a category/period column and a numeric measure (ideally one of each).</p>'
          );
        }
      }
      return;
    }
    chartState = {
      points: spec.points,
      type: spec.type,
      title: spec.title,
      labelCol: spec.labelCol,
      valueCol: spec.valueCol,
    };
    if (types && !types.childElementCount) {
      ["bar", "line", "pie"].forEach(function (t) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ask-chart-type-btn";
        btn.dataset.chartType = t;
        btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        btn.addEventListener("click", function () {
          chartState.type = t;
          paintChart();
        });
        types.appendChild(btn);
      });
    }
    paintChart();
  }

  function render(payload, question) {
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
    renderChart(question || (state.last && state.last._question) || "", payload);
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
      payload._question = question;
      render(payload, question);
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

  /**
   * Hide the nav only when the API explicitly says AI is disabled.
   * The tab is visible by default so a flaky health check cannot blank it out.
   */
  async function checkHealth() {
    var nav = document.getElementById("navAsk");
    try {
      var res = await fetch(apiBase() + "/api/ask/health", {
        headers: http.headers(),
        cache: "no-store",
      });
      state.health = res.ok ? await res.json() : { enabled: true };
    } catch (_e) {
      // Keep the tab visible; the Ask action will surface the real error.
      state.health = { enabled: true, provider: "unknown", model: "" };
    }
    if (nav) {
      nav.hidden = state.health.enabled === false;
      if (!nav.hidden) refreshIcons();
    }
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
