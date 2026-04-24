/**
 * embed.js - Script for embedding Sprout chat widget on external sites.
 *
 * Example:
 * <script
 *   src="https://your-domain.com/chat-widget/src/embed.js"
 *   data-position="left"
 * ></script>
 */

(function () {
  function getCurrentScript() {
    if (document.currentScript) {
      return document.currentScript;
    }

    const scripts = Array.from(document.getElementsByTagName("script"));
    return (
      scripts.find(
        (script) => script.src && script.src.includes("/src/embed.js"),
      ) ||
      scripts[scripts.length - 1] ||
      null
    );
  }

  function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const currentScript = getCurrentScript();
  const dataset = currentScript ? currentScript.dataset : {};
  const scriptUrl = currentScript ? currentScript.src : "";
  const embedPathIndex = scriptUrl.lastIndexOf("/src/embed.js");
  const baseUrl =
    embedPathIndex >= 0 ? scriptUrl.substring(0, embedPathIndex) : "";

  const globalConfig = window.SproutWidgetConfig || {};
  const side =
    (dataset.position || globalConfig.position || "right").toLowerCase() ===
    "left"
      ? "left"
      : "right";
  const offset = parseNumber(dataset.offset || globalConfig.offset, 20);
  const zIndex = parseNumber(dataset.zIndex || globalConfig.zIndex, 9999);
  const closedWidth = parseNumber(
    dataset.closedWidth || globalConfig.closedWidth,
    84,
  );
  const closedHeight = parseNumber(
    dataset.closedHeight || globalConfig.closedHeight,
    84,
  );
  const openWidth = parseNumber(
    dataset.openWidth || globalConfig.openWidth,
    500,
  );
  const openHeight = parseNumber(
    dataset.openHeight || globalConfig.openHeight,
    720,
  );

  const widgetConfig = {
    iframeSrc:
      dataset.iframeSrc ||
      globalConfig.iframeSrc ||
      (baseUrl
        ? `${baseUrl}/index.html`
        : "https://d11j4bfkqx6sex.cloudfront.net/chat-widget/index.html"),
    widgetId: dataset.widgetId || globalConfig.widgetId || "sprout-chat-widget",
    side,
    offset,
    zIndex,
    closedWidth,
    closedHeight,
    openWidth,
    openHeight,
  };

  function destroyWidget() {
    const container = document.getElementById(widgetConfig.widgetId);
    if (!container) {
      return;
    }

    if (typeof container._sproutCleanup === "function") {
      container._sproutCleanup();
    }

    container.remove();
  }

  function applyContainerState(container, isOpen) {
    const isMobile = window.innerWidth <= 768;
    container.style.bottom =
      isOpen && isMobile ? "0" : `${widgetConfig.offset}px`;
    container.style.left =
      widgetConfig.side === "left"
        ? isOpen && isMobile
          ? "0"
          : `${widgetConfig.offset}px`
        : "auto";
    container.style.right =
      widgetConfig.side === "right"
        ? isOpen && isMobile
          ? "0"
          : `${widgetConfig.offset}px`
        : "auto";
    container.style.width = isOpen
      ? isMobile
        ? "100vw"
        : `${widgetConfig.openWidth}px`
      : `${widgetConfig.closedWidth}px`;
    container.style.height = isOpen
      ? isMobile
        ? "100vh"
        : `${widgetConfig.openHeight}px`
      : `${widgetConfig.closedHeight}px`;
  }

  function initWidget() {
    if (document.getElementById(widgetConfig.widgetId)) {
      return;
    }

    const container = document.createElement("div");
    container.id = widgetConfig.widgetId;
    container.style.position = "fixed";
    container.style.background = "transparent";
    container.style.zIndex = String(widgetConfig.zIndex);
    container.style.transition = "none";

    const iframe = document.createElement("iframe");
    iframe.src = widgetConfig.iframeSrc;
    iframe.title = "Sprout Chat Widget";
    iframe.allow = "microphone; camera; clipboard-write";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.background = "transparent";
    iframe.style.outline = "none";

    container.appendChild(iframe);
    document.body.appendChild(container);

    let isOpen = false;
    applyContainerState(container, isOpen);

    function handleToggle(event) {
      if (event.source !== iframe.contentWindow) {
        return;
      }
      if (!event.data || event.data.type !== "sprout:toggle") {
        return;
      }

      isOpen = !!event.data.isOpen;
      applyContainerState(container, isOpen);
    }

    function handleResize() {
      applyContainerState(container, isOpen);
    }

    window.addEventListener("message", handleToggle);
    window.addEventListener("resize", handleResize);

    container._sproutCleanup = function () {
      window.removeEventListener("message", handleToggle);
      window.removeEventListener("resize", handleResize);
    };
  }

  window.SproutWidget = {
    init: initWidget,
    destroy: destroyWidget,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget, { once: true });
  } else {
    initWidget();
  }
})();
