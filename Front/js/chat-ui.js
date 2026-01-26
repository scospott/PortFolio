(() => {
  const el = {
    fab: document.getElementById("ra-fab"),
    panel: document.getElementById("ra-panel"),
    close: document.getElementById("ra-close"),
    msgs: document.getElementById("ra-messages"),
    loading: document.getElementById("ra-loading"),
    form: document.getElementById("ra-form"),
    input: document.getElementById("ra-text"),
    send: document.getElementById("ra-send"),
  };

  // If not present on a page, do nothing (allows reuse on all pages)
  const required = ["fab", "panel", "close", "msgs", "loading", "form", "input", "send"];
  if (!required.every(k => el[k])) return;

  const STORAGE_KEY = "recruiter_assistant_history_v1";
  const MAX_MESSAGES = 40;

  let isOpen = false;
  let isLoading = false;

  function scrollToBottom() {
    // next frame to ensure DOM appended
    requestAnimationFrame(() => {
      el.msgs.scrollTop = el.msgs.scrollHeight;
    });
  }

  function setOpen(open) {
    isOpen = open;

    el.panel.hidden = !open;
    el.panel.dataset.open = open ? "true" : "false";
    el.fab.setAttribute("aria-expanded", open ? "true" : "false");

    if (open) {
      // Focus for UX
      setTimeout(() => el.input.focus(), 50);
      scrollToBottom();
    }
  }

  function setLoading(on) {
    isLoading = on;
    el.loading.hidden = !on;
    el.send.disabled = on;
    el.input.disabled = on;

    if (on) scrollToBottom();
  }

  function escapeText(s) {
    // We use textContent for messages, but keep this if you later template HTML.
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function createMessageNode(role, content) {
    const wrap = document.createElement("div");
    wrap.className = `ra-msg ${role === "user" ? "ra-msg--user" : "ra-msg--assistant"}`;

    const bubble = document.createElement("div");
    bubble.className = "ra-msg__bubble";
    bubble.textContent = content;

    const meta = document.createElement("div");
    meta.className = "ra-msg__meta";
    meta.textContent = role === "user" ? "You" : "Assistant";

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    return wrap;
  }

  function appendMessage(role, content) {
    el.msgs.appendChild(createMessageNode(role, content));
    scrollToBottom();
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-MAX_MESSAGES);
    } catch {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-MAX_MESSAGES)));
    } catch {
      // ignore storage errors
    }
  }

  // In-memory history mirror of what we store
  let history = loadHistory();

  function renderHistory() {
    if (!history.length) return;
    // Keep the existing welcome message, then append stored messages
    history.forEach(m => appendMessage(m.role, m.content));
  }

  function pushHistory(role, content) {
    history.push({ role, content, t: Date.now() });
    history = history.slice(-MAX_MESSAGES);
    saveHistory(history);
  }

  function clearHistory() {
    history = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

    // Real assistant response via Netlify Function
    async function getAssistantReply(userText) {
      const resp = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: history.map(m => ({ role: m.role, content: m.content })), 
        }),
      });

      // If server returns an error status, read the body for debugging
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`API error ${resp.status}: ${errText}`);
      }

      const data = await resp.json();

      // Your backend returns { reply, sources, request_id }
    const reply = data?.reply ?? data?.answer;
    if (typeof reply !== "string") {
      throw new Error("Invalid API response: missing reply/answer");
    }
    return reply;

    }


  async function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    appendMessage("user", trimmed);
    pushHistory("user", trimmed);

    setLoading(true);

    try {
      // Small artificial delay for nicer UX
      await new Promise(r => setTimeout(r, 350));

      const reply = await getAssistantReply(trimmed);

      appendMessage("assistant", reply);
      pushHistory("assistant", reply);
    } catch (e) {
      console.error("Chat error:", e);
      const err = `Erreur: ${e?.message || "inconnue"}`;
      appendMessage("assistant", err);
      pushHistory("assistant", err);
        } finally {
          setLoading(false);
    }
  }

  // Events
  el.fab.addEventListener("click", () => setOpen(!isOpen));
  el.close.addEventListener("click", () => setOpen(false));

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (!isOpen) return;
    if (e.key === "Escape") setOpen(false);
  });

  // Click outside to close (safe)
  document.addEventListener("click", (e) => {
    if (!isOpen) return;
    const target = e.target;
    const inside = el.panel.contains(target) || el.fab.contains(target);
    if (!inside) setOpen(false);
  });

  // Submit = send (Enter)
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = el.input.value;
    el.input.value = "";
    handleSend(value);
  });

  // Optional: expose a way to clear history (dev console)
  window.__RA_CLEAR__ = clearHistory;

  // Render history on load, panel stays closed
  renderHistory();
  setOpen(false);
})();
