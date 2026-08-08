/**
 * Assets search & discovery — multi-connector catalog via connector API.
 */
(function (global) {
  "use strict";

  var http = global.DataHiveHttp;

  function withConnector(path, connectorId) {
    if (!connectorId) return path;
    var sep = path.indexOf("?") >= 0 ? "&" : "?";
    return path + sep + "connector_id=" + encodeURIComponent(connectorId);
  }

  async function fetchJson(path) {
    return http.fetchJson(path);
  }

  async function summary(connectorId) {
    try {
      return await fetchJson(withConnector("/api/assets/schemas", connectorId || "all"));
    } catch (err) {
      if (err && err.httpStatus === 404) {
        return fetchJson(withConnector("/api/assets/counts", connectorId || "all"));
      }
      throw err;
    }
  }

  global.DataHiveAssets = {
    connectors: function () {
      return fetchJson("/api/assets/connectors");
    },
    catalog: function (connectorId) {
      return fetchJson(withConnector("/api/assets/catalog", connectorId || "all"));
    },
    relevant: function (tab, type, connectorId) {
      var q = new URLSearchParams({ tab: tab || "recently_verified" });
      if (type) q.set("type", type);
      if (connectorId) q.set("connector_id", connectorId);
      return fetchJson("/api/assets/relevant?" + q.toString());
    },
    search: function (query, connectorId) {
      var q = new URLSearchParams({ q: query || "" });
      if (connectorId) q.set("connector_id", connectorId);
      return fetchJson("/api/assets/search?" + q.toString());
    },
    discover: function (connectorId) {
      return fetchJson(withConnector("/api/assets/discover?limit=200", connectorId || "all"));
    },
    summary: summary,
    schemas: function (connectorId) {
      return summary(connectorId);
    },
    tables: function (schema, connectorId) {
      return fetchJson(
        withConnector(
          "/api/assets/tables?schema=" + encodeURIComponent(schema),
          connectorId
        )
      );
    },
    structure: function (schema, table, connectorId) {
      return fetchJson(
        withConnector(
          "/api/assets/structure?schema=" +
            encodeURIComponent(schema) +
            "&table=" +
            encodeURIComponent(table),
          connectorId
        )
      );
    },
    snowflakeStages: function (connectorId) {
      return fetchJson(
        "/api/snowflake/" + encodeURIComponent(connectorId) + "/stages"
      );
    },
    snowflakeStageFiles: function (connectorId, stageFqn, pattern) {
      var path =
        "/api/snowflake/" +
        encodeURIComponent(connectorId) +
        "/stages/" +
        encodeURIComponent(stageFqn) +
        "/files";
      if (pattern) path += "?pattern=" + encodeURIComponent(pattern);
      return fetchJson(path);
    },
    snowflakeEnsureRawStage: function (connectorId) {
      return http.postJson(
        "/api/snowflake/" + encodeURIComponent(connectorId) + "/stages/ensure-raw",
        {}
      );
    },
  };
})(window);
