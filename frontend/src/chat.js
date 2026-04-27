/**
 * Chat.js - Client-side chat widget logic
 * Handles message sending, API communication, and UI updates
 */

// Configuration
const CONFIG = {
  // Chatbase proxy endpoint (relative URL — works in both dev and production)
  CHATBASE_PROXY_URL: "/api/chatbase/chat",
  // Legacy backend URL — still used for lead, feedback, session, and history
  API_URL: (window.ENV && window.ENV.API_URL) || "http://localhost:8000",
  SESSION_ENDPOINT: "/new-session",
  LEAD_ENDPOINT: "/lead",
  FEEDBACK_ENDPOINT: "/feedback",
};

// State management
let state = {
  sessionId: null,
  conversationId: null, // Chatbase conversation ID for multi-turn context
  messages: [],
  isLoading: false,
  leadFormVisible: false,
  activeRequestId: 0,
  streamAbortController: null,
  sessionIdIsGenerated: false,
};

const DEFAULT_WELCOME_MESSAGE =
  "Hi, I'm Dingo, your virtual Math Tutor! I'll guide you to the right videos, help you learn and grow your skills in Mathematics.";
const TIME_UPDATE_INTERVAL_MS = 20000;
const NETWORK_RETRY_DELAY_MS = 1200;
const NETWORK_RETRY_ATTEMPTS = 2;
const SESSION_ID_STORAGE_KEY = "sprout_session_id";
const CONVERSATION_ID_STORAGE_KEY = "chatbase_conversation_id";

const isEmbeddedFrame = (() => {
  try {
    return window.self !== window.top;
  } catch (error) {
    return true;
  }
})();

// ── Iframe navigation guard ──────────────────────────────────────────
// When the widget runs inside an iframe, ANY accidental page-level
// navigation (anchor click, form submit, etc.) will reload the iframe
// content, which re-runs init() → collapses the widget → resets the chat.
// The guards below prevent that from ever happening.
if (isEmbeddedFrame) {
  // 1. Intercept ALL anchor clicks – open in new tab instead of
  //    navigating the iframe away.  Uses capture phase so we act
  //    before any other handler can trigger navigation.
  document.addEventListener(
    "click",
    function (e) {
      const link = e.target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:"))
        return;

      const target = link.getAttribute("target");
      // If the link already opens in a new window/tab or the parent, allow it
      if (target === "_blank" || target === "_top" || target === "_parent")
        return;

      // Otherwise prevent the iframe navigation and open externally
      e.preventDefault();
      e.stopPropagation();
      window.open(link.href, "_blank");
    },
    true,
  );

  // 2. Intercept ALL form submissions that are NOT explicitly handled
  //    (only the lead-form has a proper handler with preventDefault).
  document.addEventListener(
    "submit",
    function (e) {
      if (e.defaultPrevented) return; // already handled
      if (e.target.id === "lead-form") return; // handled by handleLeadSubmit
      e.preventDefault();
      console.warn(
        "[Sprout] Blocked unhandled form submit in iframe:",
        e.target,
      );
    },
    true,
  );

  // 3. Debug helper: log whenever the page is about to unload so we
  //    can trace what caused it from the console.
  window.addEventListener("beforeunload", function () {
    console.warn("[Sprout] ⚠️  iframe is unloading / reloading!");
  });
}

// DOM elements
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const messagesContainer = document.getElementById("messages-container");
const chatPanel = document.getElementById("chat-panel");
const chatLauncher = document.getElementById("chat-launcher");
const refreshBtn = document.getElementById("refresh-btn");
const quickActionsContainer = document.getElementById("quick-actions");
const leadFormContainer = document.getElementById("lead-form-container");
const leadForm = document.getElementById("lead-form");
const leadFormCloseBtn = document.getElementById("lead-form-close");
const loadingIndicator = document.getElementById("loading-indicator");

sendBtn.disabled = true;
let relativeTimeIntervalId = null;

/**
 * Initialize the chat widget
 */
function init() {
  if (isEmbeddedFrame) {
    document.documentElement.classList.add("in-iframe");
    document.body.classList.add("in-iframe");

    // Make sure tel: / mailto: links open in the parent window
    document
      .querySelectorAll('a[href^="tel:"], a[href^="mailto:"]')
      .forEach((a) => {
        a.setAttribute("target", "_top");
      });
  }
  console.log("🌱 Sprout Chat Widget initialized");

  chatInput.addEventListener("input", () => {
    if (chatInput.value.trim() !== "") {
      sendBtn.disabled = false;
    } else {
      sendBtn.disabled = true;
    }
  });

  // Event listeners
  sendBtn.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  refreshBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleNewSession();
  });
  if (chatLauncher) {
    chatLauncher.addEventListener("click", toggleChatVisibility);
  }

  // Quick action buttons
  document.querySelectorAll(".quick-action-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action");
      handleQuickAction(action);
    });
  });

  // Lead form submission
  leadForm.addEventListener("submit", handleLeadSubmit);
  leadFormCloseBtn.addEventListener("click", handleLeadFormClose);

  // Restore session ID from cookie or create new one
  restoreSession();
  resetConversationUI();
  loadHistory();
  startRelativeTimeUpdates();

  // If we are inside an iframe and were previously open (i.e. the iframe
  // reloaded involuntarily), restore the open state instead of collapsing.
  if (isEmbeddedFrame) {
    try {
      const wasOpen = sessionStorage.getItem("sprout_chat_open");
      if (wasOpen === "1") {
        // Restore open state – don't collapse the widget
        setChatVisibility(true);
        return;
      }
    } catch (e) {}
  }

  if (chatLauncher && chatPanel) {
    setChatVisibility(false);
    try {
      chatLauncher.focus();
    } catch (e) {}
  } else {
    if (chatPanel) chatPanel.classList.remove("is-hidden");
    try {
      chatInput.focus();
    } catch (e) {}
  }
}

/**
 * Restore or create session
 */
function restoreSession() {
  const storedSessionId = readStoredSessionId();
  if (storedSessionId) {
    state.sessionId = storedSessionId;
    state.sessionIdIsGenerated = false;
    console.log("Session restored:", state.sessionId);
    return;
  }

  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "session_id" && value) {
      state.sessionId = value;
      state.sessionIdIsGenerated = false;
      persistSessionId(state.sessionId);
      console.log("Session restored:", state.sessionId);
      return;
    }
  }

  // Generate new session ID if not found
  state.sessionId = generateSessionId();
  state.sessionIdIsGenerated = true;
  console.log("📋 New session created:", state.sessionId);
}

/**
 * Generate a unique session ID
 */
function readStoredSessionId() {
  try {
    return localStorage.getItem(SESSION_ID_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

function persistSessionId(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch (e) {}
}

function clearStoredSessionId() {
  try {
    localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  } catch (e) {}
}

function getSessionHeaders() {
  return state.sessionId ? { "x-widget-session-id": state.sessionId } : {};
}

function generateSessionId() {
  return (
    "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
  );
}

function setChatVisibility(isOpen) {
  if (!chatPanel || !chatLauncher) {
    return;
  }

  chatPanel.classList.toggle("is-hidden", !isOpen);
  chatLauncher.setAttribute("aria-expanded", String(isOpen));
  chatLauncher.setAttribute(
    "aria-label",
    isOpen ? "Close chatbot" : "Open chatbot",
  );

  // Persist open state so we can restore it after an involuntary iframe reload
  if (isEmbeddedFrame) {
    try {
      sessionStorage.setItem("sprout_chat_open", isOpen ? "1" : "0");
    } catch (e) {}
    try {
      window.parent.postMessage({ type: "sprout:toggle", isOpen }, "*");
    } catch (e) {}
  }

  if (isOpen) {
    setTimeout(() => {
      try {
        chatInput.focus();
      } catch (e) {}
    }, 0);
  } else {
    try {
      chatLauncher.focus();
    } catch (e) {}
  }
}

function toggleChatVisibility() {
  const isOpen = chatLauncher.getAttribute("aria-expanded") === "true";
  setChatVisibility(!isOpen);
}

function isAbortError(error) {
  return error && error.name === "AbortError";
}

function isTransientNetworkError(error) {
  if (isAbortError(error)) return false;
  return (
    error instanceof TypeError ||
    /fetch|network|failed to load|load failed/i.test(error?.message || "")
  );
}

function waitForNetworkRetry(signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Request aborted", "AbortError"));
      return;
    }

    let settled = false;
    const cleanup = () => {
      window.removeEventListener("online", handleOnline);
      signal?.removeEventListener("abort", handleAbort);
      window.clearTimeout(timer);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const handleOnline = () => finish();
    const handleAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new DOMException("Request aborted", "AbortError"));
    };
    const timer = window.setTimeout(finish, NETWORK_RETRY_DELAY_MS);

    window.addEventListener("online", handleOnline, { once: true });
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function fetchWithNetworkRetry(url, options = {}) {
  let lastError = null;

  for (let attempt = 0; attempt <= NETWORK_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (isAbortError(error) || !isTransientNetworkError(error)) {
        throw error;
      }

      lastError = error;
      if (attempt === NETWORK_RETRY_ATTEMPTS) {
        break;
      }

      await waitForNetworkRetry(options.signal);
    }
  }

  throw lastError;
}

function parseHistoryTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadHistory() {
  const requestId = state.activeRequestId;

  try {
    const response = await fetch(`${CONFIG.API_URL}/chat/history`, {
      method: "GET",
      headers: {
        ...(state.sessionIdIsGenerated ? {} : getSessionHeaders()),
      },
      credentials: "include",
    });

    if (!response.ok || requestId !== state.activeRequestId) return;

    const sessionHeader = response.headers.get("x-session-id");
    if (sessionHeader) {
      state.sessionId = sessionHeader;
      state.sessionIdIsGenerated = false;
      persistSessionId(state.sessionId);
    }

    const history = await response.json();
    if (requestId !== state.activeRequestId || !Array.isArray(history)) return;

    renderPersistedHistory(history);
  } catch (error) {
    console.error("History load error:", error);
  }
}

function renderPersistedHistory(history) {
  const persistedMessages = history.filter(
    (message) => message && message.role && message.message,
  );
  if (!persistedMessages.length) return;

  const firstMessageTime =
    parseHistoryTimestamp(persistedMessages[0].created_at) || new Date();

  messagesContainer.innerHTML = "";
  state.messages = [];
  state.leadFormVisible = false;
  leadForm.reset();
  messagesContainer.appendChild(loadingIndicator);
  loadingIndicator.classList.add("hidden");

  addMessageToUI(DEFAULT_WELCOME_MESSAGE, "assistant", firstMessageTime);

  persistedMessages.forEach((message) => {
    addMessageToUI(
      message.message,
      message.role,
      parseHistoryTimestamp(message.created_at) || new Date(),
    );
  });

  if (persistedMessages.some((message) => message.role === "user")) {
    hideQuickActions();
  } else {
    showQuickActions();
  }

  updateRelativeTimestamps();
}

/**
 * Handle sending a message
 */
async function handleSendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  const requestId = state.activeRequestId + 1;
  state.activeRequestId = requestId;

  if (state.streamAbortController) {
    state.streamAbortController.abort();
  }
  const abortController = new AbortController();
  state.streamAbortController = abortController;

  sendBtn.disabled = true;

  // Clear input
  chatInput.value = "";
  chatInput.style.height = "auto";

  // Add user message
  addMessageToUI(message, "user");
  hideQuickActions();
  setLoading(true);

  try {
    // Build the request payload for Chatbase proxy
    const chatPayload = {
      message,
      ...(state.conversationId ? { conversationId: state.conversationId } : {}),
    };

    const response = await fetchWithNetworkRetry(
      CONFIG.CHATBASE_PROXY_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify(chatPayload),
      },
    );

    if (requestId !== state.activeRequestId) return;

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Prepare assistant message container
    const wrapperDiv = document.createElement("div");
    wrapperDiv.className = "message-wrapper assistant-wrapper";

    const messageDiv = document.createElement("div");
    messageDiv.className = "message assistant";
    wrapperDiv.appendChild(messageDiv);

    insertChatElement(wrapperDiv);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let assistantText = "";
    let streamingStarted = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (requestId !== state.activeRequestId) {
        try {
          await reader.cancel();
        } catch (e) {}
        return;
      }

      const chunk = decoder.decode(value, { stream: true });

      // Chatbase streams raw text (not SSE data: lines)
      // Append the chunk directly to the assistant text
      assistantText += chunk;

      if (requestId !== state.activeRequestId) return;

      // Hide loading bubble as soon as first token arrives
      if (!streamingStarted && assistantText.length > 0) {
        streamingStarted = true;
        setLoading(false);
      }

      messageDiv.innerHTML = parseLinksInText(assistantText);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    if (requestId !== state.activeRequestId) return;

    appendAssistantExtras(wrapperDiv, assistantText);

    // Save message in state
    state.messages.push({
      role: "assistant",
      content: assistantText,
      timestamp: new Date(),
    });

    // Show lead form after first exchange
    const userMessageCount = state.messages.filter(
      (entry) => entry.role === "user",
    ).length;

    if (userMessageCount === 1 && !state.leadFormVisible) {
      showLeadForm();
    }
  } catch (error) {
    if (isAbortError(error) || requestId !== state.activeRequestId) {
      return;
    }
    console.error("❌ Chat error:", error);
    addMessageToUI(
      isTransientNetworkError(error)
        ? "Connection looks unstable. Please check your internet and try again."
        : "Sorry, I encountered an error. Please try again.",
      "assistant",
    );
  } finally {
    if (requestId === state.activeRequestId) {
      setLoading(false);
      state.streamAbortController = null;
      try {
        chatInput.focus();
      } catch (e) {}
    }
  }
}

/**
 * Handle quick action button clicks
 */
function handleQuickAction(action) {
  let message = "";

  if (action === "product") {
    message = "I need to find/purchase a product";
  } else if (action === "help") {
    message = "I need help with an existing product";
  }

  if (message) {
    chatInput.value = message;
    handleSendMessage();
  }
}

// const notice = document.getElementById("privacy-notice");
// const closeBtn = document.getElementById("close-privacy");

// if (localStorage.getItem("privacyClosed")) {
//   notice.style.display = "none";
// }

// closeBtn.addEventListener("click", () => {
//   notice.style.display = "none";
//   localStorage.setItem("privacyClosed", "true");
// });

const notice = document.getElementById("privacy-notice");
const closeBtn = document.getElementById("close-privacy");

closeBtn.addEventListener("click", () => {
  notice.style.display = "none";
});

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return "1 minute ago";
  if (diffMin < 60) return `${diffMin} minutes ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hour ago";
  if (diffHr < 24) return `${diffHr} hours ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "1 day ago";
  return `${diffDay} days ago`;
}

function updateRelativeTimestamps() {
  document
    .querySelectorAll(".message-time[data-timestamp]")
    .forEach((element) => {
      const timestamp = element.getAttribute("data-timestamp");
      const messageTime = timestamp ? new Date(timestamp) : null;
      if (!messageTime || Number.isNaN(messageTime.getTime())) return;
      element.textContent = getRelativeTime(messageTime);
    });
}

function startRelativeTimeUpdates() {
  if (relativeTimeIntervalId !== null) return;
  relativeTimeIntervalId = window.setInterval(
    updateRelativeTimestamps,
    TIME_UPDATE_INTERVAL_MS,
  );
}

function appendAssistantExtras(wrapperDiv, content, messageTime = new Date()) {
  if (/contact/i.test(content)) {
    const contactBtn = document.createElement("a");
    contactBtn.href = "https://www.richgro.com.au/contact-us/";
    contactBtn.target = "_blank";
    contactBtn.rel = "noopener";
    contactBtn.className = "contact-us-btn";
    contactBtn.textContent = "Contact Us";
    wrapperDiv.appendChild(contactBtn);
  }

  const actionsRow = document.createElement("div");
  actionsRow.className = "message-actions";

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.dataset.timestamp = messageTime.toISOString();
  timeSpan.textContent = getRelativeTime(messageTime);
  actionsRow.appendChild(timeSpan);

  const divider = document.createElement("span");
  divider.className = "action-divider";
  divider.textContent = "|";
  actionsRow.appendChild(divider);

  const thumbUp = document.createElement("button");
  thumbUp.className = "action-btn";
  thumbUp.title = "Helpful";
  thumbUp.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>`;

  const thumbDown = document.createElement("button");
  thumbDown.className = "action-btn";
  thumbDown.title = "Not helpful";
  thumbDown.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/></svg>`;

  const copyBtn = document.createElement("button");
  copyBtn.className = "action-btn";
  copyBtn.title = "Copy";
  copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  const copyIcon = copyBtn.innerHTML;
  const copiedIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

  const feedbackThanks = document.createElement("span");
  feedbackThanks.className = "action-thanks hidden";
  feedbackThanks.textContent = "Thanks!";

  thumbUp.addEventListener("click", () => {
    if (thumbUp.classList.contains("selected")) return;
    thumbUp.classList.add("selected");
    thumbDown.classList.remove("selected", "down");
    feedbackThanks.classList.remove("hidden");
    const userMsg = findPreviousUserMessage();
    sendFeedback("up", userMsg, content);
  });

  thumbDown.addEventListener("click", () => {
    if (thumbDown.classList.contains("selected")) return;
    thumbDown.classList.add("selected", "down");
    thumbUp.classList.remove("selected");
    feedbackThanks.classList.remove("hidden");
    const userMsg = findPreviousUserMessage();
    sendFeedback("down", userMsg, content);
  });

  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(content).then(() => {
      copyBtn.classList.add("selected");
      copyBtn.innerHTML = copiedIcon;
      copyBtn.title = "Copied!";
      setTimeout(() => {
        copyBtn.classList.remove("selected");
        copyBtn.innerHTML = copyIcon;
        copyBtn.title = "Copy";
      }, 1500);
    });
  });

  actionsRow.appendChild(thumbUp);
  actionsRow.appendChild(thumbDown);
  actionsRow.appendChild(copyBtn);
  actionsRow.appendChild(feedbackThanks);
  wrapperDiv.appendChild(actionsRow);
}

/**
 * Add message to UI
 */
function addMessageToUI(content, role, messageTime = new Date()) {
  // Create wrapper div
  const wrapperDiv = document.createElement("div");
  wrapperDiv.className = `message-wrapper ${role === "user" ? "user-wrapper" : "assistant-wrapper"}`;

  // Create message div
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${role}`;

  // Parse links in the response
  messageDiv.innerHTML = parseLinksInText(content);

  wrapperDiv.appendChild(messageDiv);

  if (role === "assistant") {
    appendAssistantExtras(wrapperDiv, content, messageTime);
  }

  // Insert message right before the loading indicator so loading is always at the bottom
  insertChatElement(wrapperDiv);

  // Store message in state
  // Use "assistant" instead of "bot" for consistency with API
  const messageRole = role === "bot" ? "assistant" : role;
  state.messages.push({
    role: messageRole,
    content,
    timestamp: messageTime,
  });

  // Scroll to bottom
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 0);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatInlineMarkdown(text) {
  let html = escapeHtml(text);

  html = html.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    (_, alt, url) =>
      `<img class="chat-product-image" src="${url}" alt="${escapeHtml(alt || "Image")}" loading="lazy" />`,
  );
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`,
  );
  html = html.replace(
    /(^|[\s(>])(https?:\/\/[^\s<]+[^\s<.,:;"')\]])/gm,
    '$1<a href="$2" target="_blank" rel="noopener">$2</a>',
  );
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(^|[^\w])_([^_\n]+?)_(?=[^\w]|$)/g, "$1<em>$2</em>");

  return html;
}

function parseLinksInText(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let paragraphLines = [];
  let inUl = false;
  let inOl = false;

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    result.push(`<p>${paragraphLines.join("<br>")}</p>`);
    paragraphLines = [];
  };

  const closeLists = () => {
    if (inUl) {
      result.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      result.push("</ol>");
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeLists();
      continue;
    }

    const ulMatch = line.match(/^[-*•]\s+(.+)/);
    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    const headingMatch = line.match(/^#{1,6}\s+(.+)/);

    if (headingMatch) {
      flushParagraph();
      closeLists();
      result.push(
        `<p><strong>${formatInlineMarkdown(headingMatch[1])}</strong></p>`,
      );
      continue;
    }

    if (ulMatch) {
      flushParagraph();
      if (inOl) {
        result.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        result.push("<ul>");
        inUl = true;
      }
      result.push(`<li>${formatInlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    if (olMatch) {
      flushParagraph();
      if (inUl) {
        result.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        result.push("<ol>");
        inOl = true;
      }
      result.push(`<li>${formatInlineMarkdown(olMatch[2])}</li>`);
      continue;
    }

    closeLists();
    paragraphLines.push(formatInlineMarkdown(line));
  }

  flushParagraph();
  closeLists();

  return result.join("\n");
}

/**
 * Find the most recent user message (for feedback context)
 */
function findPreviousUserMessage() {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    if (state.messages[i].role === "user") {
      return state.messages[i].content;
    }
  }
  return "";
}

/**
 * Show/hide quick actions
 */
function hideQuickActions() {
  if (quickActionsContainer) quickActionsContainer.classList.add("hidden");
}

function showQuickActions() {
  if (quickActionsContainer) quickActionsContainer.classList.remove("hidden");
}

/**
 * Show/hide lead form
 */
function showLeadForm() {
  state.leadFormVisible = true;
  insertChatElement(leadFormContainer);
  leadFormContainer.style.display = "";

  // Scroll to bottom
  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 0);
}

function hideLeadForm() {
  state.leadFormVisible = false;
  leadFormContainer.style.display = "none";
  leadForm.reset();
}

function resetConversationUI() {
  messagesContainer.innerHTML = "";
  state.messages = [];
  state.leadFormVisible = false;
  leadForm.reset();
  messagesContainer.appendChild(loadingIndicator);
  loadingIndicator.classList.add("hidden");
  addMessageToUI(DEFAULT_WELCOME_MESSAGE, "assistant");
  showQuickActions();
}

function insertChatElement(element) {
  if (loadingIndicator.parentNode === messagesContainer) {
    messagesContainer.insertBefore(element, loadingIndicator);
    return;
  }

  messagesContainer.appendChild(element);
}

function createLeadStatusCard(type, message) {
  const wrapperDiv = document.createElement("div");
  wrapperDiv.className = "message-wrapper assistant-wrapper";

  const card = document.createElement("div");
  card.className = "message assistant lead-status-card";

  const icon = document.createElement("div");
  icon.className = `lead-status-icon ${type}`;

  if (type === "success") {
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  } else {
    icon.innerHTML = '<span aria-hidden="true">i</span>';
  }

  const text = document.createElement("div");
  text.className = "lead-status-text";
  text.textContent = message;

  card.appendChild(icon);
  card.appendChild(text);
  wrapperDiv.appendChild(card);
  insertChatElement(wrapperDiv);

  setTimeout(() => {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, 0);
}

function handleLeadFormClose() {
  hideLeadForm();
  createLeadStatusCard(
    "info",
    "No problem, you can continue without sharing your details.",
  );
}

/**
 * Handle lead form submission
 */
async function handleLeadSubmit(e) {
  e.preventDefault();

  const leadName = document.getElementById("lead-name");
  const leadEmail = document.getElementById("lead-email");
  const leadPhone = document.getElementById("lead-phone");
  const leadAddress = document.getElementById("lead-address");
  const leadMessage = document.getElementById("lead-message");

  const leadData = {
    name: leadName ? leadName.value : "",
    email: leadEmail ? leadEmail.value : "",
    phone: leadPhone ? leadPhone.value : "",
    address: leadAddress ? leadAddress.value : "",
    message: leadMessage ? leadMessage.value : "",
    session_id: state.sessionId,
  };

  setLoading(true);

  try {
    const response = await fetch(`${CONFIG.API_URL}${CONFIG.LEAD_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      throw new Error("Failed to submit lead");
    }

    const data = await response.json();
    console.log("Lead submitted:", data);

    hideLeadForm();
    createLeadStatusCard("success", "Thanks! You're all set.");
  } catch (error) {
    console.error("Lead submission error:", error);
    addMessageToUI(
      "Sorry, I couldn't submit your information. Please try again.",
      "assistant",
    );
  } finally {
    setLoading(false);
  }
}

/**
 * Handle new session / refresh chat
 */
async function handleNewSession() {
  // In cross-origin iframes confirm() may silently return true/false
  // or cause the browser to reload the frame. Use a safer check.
  // const shouldReset = isEmbeddedFrame
  //   ? true
  //   : confirm("Start a new conversation? Current chat will be cleared.");

  // if (!shouldReset) return;

  state.activeRequestId += 1;
  if (state.streamAbortController) {
    state.streamAbortController.abort();
    state.streamAbortController = null;
  }
  setLoading(false);

  try {
    // Call backend to clear session
    await fetch(`${CONFIG.API_URL}${CONFIG.SESSION_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getSessionHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({
        session_id: state.sessionId,
      }),
    });
  } catch (error) {
    console.error("Session clear error:", error);
  }

  clearStoredSessionId();
  // Also clear Chatbase conversation ID for a fresh conversation
  state.conversationId = null;
  try {
    localStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
  } catch (e) {}
  state.sessionId = generateSessionId();
  state.sessionIdIsGenerated = false;
  persistSessionId(state.sessionId);
  resetConversationUI();
  hideLeadForm();
  setChatVisibility(true);
  try {
    chatInput.focus();
  } catch (e) {}
}

/**
 * Set loading state
 */
function setLoading(isLoading) {
  state.isLoading = isLoading;

  if (isLoading) {
    loadingIndicator.classList.remove("hidden");
    // Scroll to show loading indicator
    setTimeout(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
  } else {
    loadingIndicator.classList.add("hidden");
  }

  sendBtn.disabled = isLoading;
  chatInput.disabled = isLoading;
}

/**
 * Send feedback (thumbs up/down)
 */
async function sendFeedback(rating, userMessage, botAnswer) {
  try {
    const response = await fetch(
      `${CONFIG.API_URL}${CONFIG.FEEDBACK_ENDPOINT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          question: userMessage,
          answer: botAnswer,
          rating: rating, // "up" or "down"
          session_id: state.sessionId,
        }),
      },
    );

    if (response.ok) {
      console.log("✅ Feedback sent:", rating);
    }
  } catch (error) {
    console.error("❌ Feedback error:", error);
  }
}

/**
 * Auto-resize input based on content
 */
chatInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 100) + "px";
});

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
