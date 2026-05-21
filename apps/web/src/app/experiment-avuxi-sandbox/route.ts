/**
 * /experiment-avuxi-sandbox · QA #002 minimal reproducible test.
 *
 * Pure HTML/JS response · NO React in the rendered page · NO
 * react-map-gl · NO HotelValora components. Replicates the official
 * AVUXI Mapbox example as closely as possible:
 *
 *   1. <div id="cmap_container">
 *   2. Native mapbox-gl loaded from CDN (not the bundled version)
 *   3. AVUXI script loaded exactly from official URL
 *   4. AVUXI.mapStart(map, window.mapboxgl, scriptId, options) ·
 *      4-argument signature confirmed from operator's dashboard
 *      reference (this was the bug in the React prototype)
 *
 * Token is injected server-side from NEXT_PUBLIC_MAPBOX_TOKEN so the
 * page can mount mapbox-gl. Everything else is vanilla JS in the
 * browser · no framework code between AVUXI and the map.
 *
 * Visit https://www.hotelvalora.com/experiment-avuxi-sandbox post-deploy.
 * The operator answers the 5 questions of the QA #002 brief by visually
 * inspecting the page.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const SCRIPT_ID = "fad4d930-e615-4c0c-9d15-e5f8fdd2224a";

function buildHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AVUXI · isolated sandbox · QA #002</title>

  <!-- Mapbox GL JS · native CDN · no react-map-gl -->
  <link
    href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css"
    rel="stylesheet"
  />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>

  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-monospace, "SFMono-Regular", "SF Mono", Menlo, monospace;
      color: #0f172a;
      background: #f1f5f9;
    }
    #status {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: white;
      border-bottom: 1px solid #cbd5e1;
      padding: 10px 16px;
      font-size: 12px;
      display: flex;
      gap: 14px;
      align-items: center;
      flex-wrap: wrap;
      z-index: 1000;
    }
    #status code {
      background: #e2e8f0;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 11px;
    }
    .ok { color: #059669; font-weight: 700; }
    .err { color: #dc2626; font-weight: 700; }
    .warn { color: #b45309; font-weight: 700; }
    #cmap_container {
      position: fixed;
      top: 52px; left: 0; right: 0; bottom: 0;
      background: #e2e8f0;
    }
    #log {
      position: fixed;
      bottom: 12px;
      left: 12px;
      width: min(520px, calc(100vw - 24px));
      max-height: 60vh;
      background: rgba(255,255,255,0.97);
      backdrop-filter: blur(8px);
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 11px;
      overflow-y: auto;
      z-index: 999;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }
    #log h3 {
      margin: 0 0 6px 0;
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    .entry { margin-bottom: 3px; line-height: 1.5; word-break: break-all; }
    .req-200 { color: #059669; }
    .req-non { color: #b45309; }
    .req-err { color: #dc2626; }
    .req-ok-empty { color: #b45309; }
    .req-ok-data { color: #059669; }
    .meta { color: #64748b; }
    .pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: 700;
      font-size: 10px;
      margin-right: 4px;
    }
    .pill-ok { background: #d1fae5; color: #065f46; }
    .pill-err { background: #fee2e2; color: #991b1b; }
    .pill-warn { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>

<div id="status">
  <span><strong>AVUXI sandbox</strong></span>
  <span>script <code>${SCRIPT_ID.slice(0, 8)}…</code></span>
  <span>mapbox: <span id="mb-status" class="err">init</span></span>
  <span>avuxi script: <span id="av-script" class="err">pending</span></span>
  <span>mapStart: <span id="ms-status" class="err">pending</span></span>
  <span>DOM container: <span id="dom-count" class="err">0</span></span>
  <span>buttons: <span id="btn-count" class="err">0</span></span>
  <span>avuxi reqs: <span id="req-count" class="err">0</span></span>
</div>

<div id="cmap_container"></div>

<div id="log">
  <h3>Sandbox event log</h3>
</div>

<script>
(function() {
  "use strict";

  var MAPBOX_TOKEN = ${JSON.stringify(MAPBOX_TOKEN)};
  var SCRIPT_ID = ${JSON.stringify(SCRIPT_ID)};
  var AVUXI_SDK = "https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js";

  var logEl = document.getElementById("log");
  var reqCount = 0;

  function log(msg, cls) {
    var ts = new Date().toISOString().slice(11, 23);
    var entry = document.createElement("div");
    entry.className = "entry" + (cls ? " " + cls : "");
    entry.textContent = ts + " · " + msg;
    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
    console.log("[sandbox] " + msg);
  }

  function setStatus(id, txt, cls) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt;
    el.className = cls || "";
  }

  // ─── Token presence check ──────────────────────────────────────────
  if (!MAPBOX_TOKEN) {
    log("FATAL · NEXT_PUBLIC_MAPBOX_TOKEN not present server-side", "req-err");
    return;
  }

  // ─── Fetch interceptor · captures *.avuxi.com response status + body ──
  var _fetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (url.indexOf("avuxi.com") === -1) return _fetch(input, init);
    reqCount++;
    setStatus("req-count", String(reqCount), reqCount > 0 ? "ok" : "err");
    var t0 = performance.now();
    return _fetch(input, init).then(function(response) {
      var elapsed = Math.round(performance.now() - t0);
      var clone = response.clone();
      return clone.text().catch(function() { return "(body read failed)"; }).then(function(body) {
        var preview = (body || "").slice(0, 160);
        var classKey;
        if (!response.ok) classKey = "req-non";
        else if (preview === "[]" || preview === "{}" || preview === "") classKey = "req-ok-empty";
        else classKey = "req-ok-data";
        log("FETCH " + response.status + " · " + elapsed + "ms · " + url.slice(0, 70) + " · body: " + (preview || "(empty)"), classKey);
        return response;
      });
    }).catch(function(e) {
      var elapsed = Math.round(performance.now() - t0);
      log("FETCH ERROR · " + elapsed + "ms · " + url + " · " + e.message, "req-err");
      throw e;
    });
  };

  // ─── XHR interceptor · same scope ───────────────────────────────────
  var OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    var xhr = new OriginalXHR();
    var capturedUrl = "";
    var _open = xhr.open;
    xhr.open = function(method, url) {
      capturedUrl = String(url);
      return _open.apply(xhr, arguments);
    };
    var _send = xhr.send;
    xhr.send = function() {
      if (capturedUrl.indexOf("avuxi.com") !== -1) {
        reqCount++;
        setStatus("req-count", String(reqCount), reqCount > 0 ? "ok" : "err");
        var t0 = performance.now();
        xhr.addEventListener("loadend", function() {
          var elapsed = Math.round(performance.now() - t0);
          var body = "";
          try { body = String(xhr.responseText || "").slice(0, 160); } catch(e) {}
          var classKey;
          if (xhr.status < 200 || xhr.status >= 300) classKey = "req-non";
          else if (body === "[]" || body === "{}" || body === "") classKey = "req-ok-empty";
          else classKey = "req-ok-data";
          log("XHR " + xhr.status + " · " + elapsed + "ms · " + capturedUrl.slice(0, 70) + " · body: " + (body || "(empty)"), classKey);
        });
      }
      return _send.apply(xhr, arguments);
    };
    return xhr;
  };

  // ─── DOM counters · MutationObserver on body ───────────────────────
  function refreshDom() {
    var containers = document.querySelectorAll(".category-control-container").length;
    var btns = document.querySelectorAll(".category-btn").length;
    setStatus("dom-count", String(containers), containers > 0 ? "ok" : "err");
    setStatus("btn-count", String(btns), btns > 0 ? "ok" : "err");
  }
  refreshDom();
  new MutationObserver(refreshDom).observe(document.body, { childList: true, subtree: true });

  // ─── mapbox-gl mount (NATIVE · no react-map-gl) ────────────────────
  log("verifying window.mapboxgl from CDN");
  if (!window.mapboxgl) {
    log("FATAL · window.mapboxgl not present after CDN load", "req-err");
    setStatus("mb-status", "no-mapboxgl", "err");
    return;
  }
  log("window.mapboxgl version: " + (window.mapboxgl.version || "unknown"));

  window.mapboxgl.accessToken = MAPBOX_TOKEN;
  log("creating mapboxgl.Map · container='cmap_container' · style=light-v11");

  var map;
  try {
    map = new window.mapboxgl.Map({
      container: "cmap_container",
      style: "mapbox://styles/mapbox/light-v11",
      center: [-3.7038, 40.4168],
      zoom: 13
    });
  } catch (e) {
    log("FATAL · mapbox-gl Map constructor threw: " + e.message, "req-err");
    setStatus("mb-status", "ctor-error", "err");
    return;
  }

  map.on("error", function(e) {
    var msg = (e && e.error && e.error.message) || "unknown";
    log("mapbox 'error' event: " + msg, "req-non");
  });

  map.on("load", function() {
    log("mapbox 'load' event fired");
    setStatus("mb-status", "loaded", "ok");
    var containerId = map.getContainer().id || "(none)";
    log("map.getContainer().id = " + JSON.stringify(containerId));

    // ─── Inject AVUXI script ────────────────────────────────────────
    log("injecting <script src='" + AVUXI_SDK + "'>");
    var scriptEl = document.createElement("script");
    scriptEl.src = AVUXI_SDK;
    scriptEl.async = true;
    scriptEl.onload = function() {
      log("AVUXI script onload fired");
      setStatus("av-script", "loaded", "ok");

      if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") {
        log("FATAL · window.AVUXI.mapStart not present after script load", "req-err");
        setStatus("ms-status", "no-AVUXI", "err");
        return;
      }
      log("window.AVUXI is present · keys: " + Object.keys(window.AVUXI).join(", "));

      // ─── THE CRITICAL CALL · 4-arg signature ─────────────────────
      log("calling AVUXI.mapStart(map, window.mapboxgl, scriptId, options)");
      try {
        window.AVUXI.mapStart(
          map,
          window.mapboxgl,
          SCRIPT_ID,
          {
            buttonOrientation: "vertical",
            buttonBackgroundColor: "#ffffff",
            buttonForegroundColor: "#0E4B31",
            buttonLocation: "tr",
            showLegend: true,
            language: "en",
            showMetro: true,
            defaultCategory: "eating",
            opacity: 55
          }
        );
        log("AVUXI.mapStart returned (synchronously)");
        setStatus("ms-status", "called", "ok");
      } catch (e) {
        log("AVUXI.mapStart THREW: " + e.message + " · stack: " + ((e.stack || "").slice(0, 200)), "req-err");
        setStatus("ms-status", "throw", "err");
      }
    };
    scriptEl.onerror = function(e) {
      log("AVUXI script onerror fired · network or CSP block", "req-err");
      setStatus("av-script", "load-error", "err");
    };
    document.body.appendChild(scriptEl);
  });

  log("sandbox bootstrap complete · waiting for mapbox 'load'");
})();
</script>

</body>
</html>`;
}

export function GET() {
  return new NextResponse(buildHtml(), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
