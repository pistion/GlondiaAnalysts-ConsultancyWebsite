document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("roxanne-chat-form");
  if (!form) return;

  const input = document.getElementById("roxanne-input");
  const log = document.getElementById("roxanne-chat-log");
  const status = document.getElementById("roxanne-chat-status");
  const submitButton = document.getElementById("roxanne-send");
  const voiceButton = document.getElementById("roxanne-voice");
  const suggestionButtons = Array.from(document.querySelectorAll(".roxanne-suggestion"));
  const endpoint = form.dataset.endpoint || "/api/roxanne-chat";
  const conversation = [];

  const setStatus = (message, state = "idle") => {
    if (!status) return;
    status.textContent = message;
    if (state === "idle") {
      status.removeAttribute("data-state");
      return;
    }
    status.setAttribute("data-state", state);
  };

  const resizeInput = () => {
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  };

  const scrollLogToBottom = () => {
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  };

  const createMessage = (role, text, pending = false) => {
    const wrapper = document.createElement("article");
    wrapper.className = `roxanne-message roxanne-message--${role}${pending ? " roxanne-message--pending" : ""}`;

    const avatar = document.createElement("div");
    avatar.className = "roxanne-message__avatar";
    avatar.textContent = role === "assistant" ? "R" : "Y";

    const content = document.createElement("div");
    content.className = "roxanne-message__content";

    const meta = document.createElement("p");
    meta.className = "roxanne-message__meta";
    meta.textContent = role === "assistant" ? "Roxanne" : "You";

    const bubble = document.createElement("div");
    bubble.className = "roxanne-message__bubble";
    bubble.textContent = text;

    content.append(meta, bubble);
    wrapper.append(avatar, content);
    log.appendChild(wrapper);
    scrollLogToBottom();
    return wrapper;
  };

  const setBusy = busy => {
    form.classList.toggle("is-loading", busy);
    if (submitButton) submitButton.disabled = busy;
    suggestionButtons.forEach(button => {
      button.disabled = busy;
    });
  };

  const sendMessage = async providedMessage => {
    const rawMessage = typeof providedMessage === "string" ? providedMessage : input.value;
    const message = rawMessage.trim();
    if (!message) return;

    createMessage("user", message);
    conversation.push({ role: "user", content: message });

    input.value = "";
    resizeInput();
    input.focus();

    const pendingMessage = createMessage("assistant", "Roxanne is thinking...", true);
    setBusy(true);
    setStatus("Roxanne is drafting a response...");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          messages: conversation,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Chat request failed.");
      }

      pendingMessage.remove();
      const reply = typeof result.reply === "string" && result.reply.trim()
        ? result.reply.trim()
        : "I couldn't generate a response just now.";

      createMessage("assistant", reply);
      conversation.push({ role: "assistant", content: reply });
      setStatus(
        result.configured === false
          ? "The chat UI is live, but the server API credentials still need to be configured for production replies."
          : "Roxanne is ready for your next question.",
        result.configured === false ? "warning" : "success"
      );
    } catch (error) {
      pendingMessage.remove();
      createMessage(
        "assistant",
        "I hit a connection issue just now. Please try again in a moment or reach the Glondia team through the contact page."
      );
      setStatus(error.message || "Failed to reach Roxanne.", "error");
    } finally {
      setBusy(false);
      input.focus();
    }
  };

  resizeInput();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("mode") === "voice") {
    setStatus("Voice entry is open. Roxanne voice can be connected here once your voice workflow is enabled.", "warning");
  }

  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    sendMessage();
  });

  suggestionButtons.forEach(button => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.roxannePrompt || button.textContent || "";
      sendMessage(prompt);
    });
  });

  if (voiceButton) {
    voiceButton.addEventListener("click", () => {
      setStatus("Voice mode can be connected here for Roxanne once your live voice API is enabled.", "warning");
      input.focus();
    });
  }
});
