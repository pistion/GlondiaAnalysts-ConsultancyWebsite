import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { dbOps } from "./db.js";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", true);

const ARTICLE_SLUGS = new Set(["sustainable-development"]);
const ARTICLE_LIBRARY = [
  {
    slug: "sustainable-development",
    title: "Sustainable Development",
    strap: "Background, Critique & Theoretical Frameworks",
    summary: "A Glondia article examining how sustainable development evolved from the Brundtland Report into a global policy framework, where the concept succeeds, where it struggles, and which major theories continue to shape the debate.",
    date: "May 5, 2026",
    coverImage: "imgs/article-sustainable-development.png",
  },
];
const SHARE_NETWORKS = new Set(["system", "copy", "linkedin", "x", "facebook", "reddit", "instagram"]);
const SIMPLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// === EJS Configuration ===
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// === CORS Configuration ===
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "https://your-hostgator-domain.com",      // ← replace with actual domain if needed
    "https://www.your-hostgator-domain.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

function sanitizeRoxanneMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(item => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .map(item => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000),
    }))
    .filter(item => item.content)
    .slice(-10);
}

function extractTextFromValue(value) {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";

  return value
    .map(part => {
      if (typeof part === "string") return part;
      if (typeof part?.text === "string") return part.text;
      if (typeof part?.content === "string") return part.content;
      if (typeof part?.value === "string") return part.value;
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractRoxanneReply(payload) {
  const directReply = extractTextFromValue(payload?.reply) || extractTextFromValue(payload?.output_text);
  if (directReply) return directReply;

  if (Array.isArray(payload?.choices)) {
    for (const choice of payload.choices) {
      const content =
        extractTextFromValue(choice?.message?.content) ||
        extractTextFromValue(choice?.delta?.content) ||
        extractTextFromValue(choice?.text);
      if (content) return content;
    }
  }

  if (Array.isArray(payload?.output)) {
    for (const item of payload.output) {
      const content = extractTextFromValue(item?.content) || extractTextFromValue(item?.text);
      if (content) return content;
    }
  }

  if (Array.isArray(payload?.data)) {
    for (const item of payload.data) {
      const content = extractTextFromValue(item?.content) || extractTextFromValue(item?.text);
      if (content) return content;
    }
  }

  return "";
}

function getRoxanneConfig() {
  const mode = (process.env.ROXANNE_API_MODE || "chat").toLowerCase() === "responses" ? "responses" : "chat";
  return {
    mode,
    url: process.env.ROXANNE_API_URL || (mode === "responses"
      ? "https://api.openai.com/v1/responses"
      : "https://api.openai.com/v1/chat/completions"),
    key: process.env.ROXANNE_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.ROXANNE_API_MODEL || "gpt-4.1-mini",
    timeoutMs: Number(process.env.ROXANNE_API_TIMEOUT_MS || 30000),
    systemPrompt: process.env.ROXANNE_SYSTEM_PROMPT || [
      "You are Roxanne, Glondia's customer-facing AI assistant.",
      "Help visitors understand Glondia services, project scoping, next steps, and consultation pathways.",
      "Be concise, clear, warm, and practical.",
      "Do not invent pricing or legal guarantees. If a question needs formal follow-up, encourage the user to contact Glondia directly."
    ].join(" "),
  };
}

function getRoxanneHeaders(config) {
  let extraHeaders = {};
  if (process.env.ROXANNE_API_HEADERS) {
    try {
      extraHeaders = JSON.parse(process.env.ROXANNE_API_HEADERS);
    } catch (error) {
      console.warn("ROXANNE_API_HEADERS is not valid JSON:", error.message);
    }
  }

  return {
    "Content-Type": "application/json",
    ...(config.key ? { Authorization: `Bearer ${config.key}` } : {}),
    ...extraHeaders,
  };
}

function buildRoxannePayload(config, history) {
  if (config.mode === "responses") {
    return {
      model: config.model,
      input: history.map(item => ({
        role: item.role,
        content: item.content,
      })),
    };
  }

  return {
    model: config.model,
    temperature: 0.5,
    messages: history.map(item => ({
      role: item.role,
      content: item.content,
    })),
  };
}

function normalizeArticleSlug(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  const candidate = forwardedIp || req.ip || req.socket?.remoteAddress || "";
  return candidate.replace(/^::ffff:/, "") || "unknown";
}

function mapArticleComment(comment, clientIp) {
  return {
    id: Number(comment.id),
    name: comment.name,
    email: comment.email,
    message: comment.message,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    canManage: comment.ipAddress === clientIp,
  };
}

function buildArticleDiscussion(articleSlug, clientIp) {
  if (clientIp && clientIp !== "unknown") {
    dbOps.trackArticleView(articleSlug, clientIp);
  }

  const comments = dbOps.getArticleComments(articleSlug);
  const reactions = dbOps.getArticleReactionCounts(articleSlug);

  return {
    ok: true,
    slug: articleSlug,
    counts: {
      uniqueViews: dbOps.getArticleUniqueViewCount(articleSlug),
      likes: reactions.up,
      comments: comments.length,
      shares: dbOps.getArticleShareCount(articleSlug),
      up: reactions.up,
      down: reactions.down,
    },
    viewer: {
      reaction: clientIp ? dbOps.getArticleReactionForIp(articleSlug, clientIp) : "",
    },
    comments: comments.map(comment => mapArticleComment(comment, clientIp)),
  };
}

function buildArticleStats(articleSlug) {
  const comments = dbOps.getArticleComments(articleSlug);
  const reactions = dbOps.getArticleReactionCounts(articleSlug);

  return {
    ok: true,
    slug: articleSlug,
    counts: {
      uniqueViews: dbOps.getArticleUniqueViewCount(articleSlug),
      likes: reactions.up,
      comments: comments.length,
      shares: dbOps.getArticleShareCount(articleSlug),
      up: reactions.up,
      down: reactions.down,
    },
  };
}

function validateArticleSlug(req, res, next) {
  const articleSlug = normalizeArticleSlug(req.params.slug);
  if (!ARTICLE_SLUGS.has(articleSlug)) {
    return res.status(404).json({ ok: false, error: "Article not found." });
  }

  req.articleSlug = articleSlug;
  req.clientIp = getClientIp(req);
  next();
}

function validateArticleCommentInput(body) {
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 120) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 800) : "";

  if (!name || !email || !message) {
    return { error: "Name, email, and comment are required." };
  }

  if (!SIMPLE_EMAIL_PATTERN.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  return { name, email, message };
}

// === Serve Static Files ===
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// === Redirect .html URLs to clean versions ===
app.use((req, res, next) => {
  if (!/\/.+\.html$/.test(req.path)) {
    next();
    return;
  }

  const cleanUrl = req.path.replace(/\.html$/, "");
  res.redirect(301, cleanUrl);
});

// === INDEX PAGE ===
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/publications", (req, res) => {
  res.render("publications");
});

app.get("/publications/articles", (req, res) => {
  res.render("article-library", {
    articles: ARTICLE_LIBRARY,
  });
});

app.get("/publications/:slug", (req, res, next) => {
  const articleSlug = normalizeArticleSlug(req.params.slug);
  if (!ARTICLE_SLUGS.has(articleSlug)) {
    next();
    return;
  }

  res.render("articles");
});

app.get("/articles", (req, res) => {
  res.redirect(301, "/publications/articles");
});

app.get(["/Research", "/research"], (req, res) => {
  res.redirect(301, "/publications");
});

app.get("/articles/:slug", (req, res) => {
  const articleSlug = normalizeArticleSlug(req.params.slug);
  if (!ARTICLE_SLUGS.has(articleSlug)) {
    res.redirect(301, "/publications");
    return;
  }

  res.redirect(301, `/publications/${articleSlug}`);
});

// === Serve clean URLs as if they were .ejs templates ===
app.get("/:page", (req, res, next) => {
  const viewPath = path.join(__dirname, "views", `${req.params.page}.ejs`);
  if (fs.existsSync(viewPath)) {
    res.render(req.params.page);
  } else {
    next();
  }
});

// === HEALTH CHECK ===
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// === API ENDPOINTS ===

// Contact Form
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  try {
    dbOps.saveMessage(name, email, message);
    console.log("📨 New contact message from:", email);
    res.json({ ok: true, message: "Message received successfully!" });
  } catch (err) {
    console.error("❌ Contact DB error:", err);
    res.status(500).json({ ok: false, error: "Failed to save message." });
  }
});

// Service Application
app.post("/api/apply", (req, res) => {
  const { fullName, businessName, address, phone, email, serviceRequest } = req.body;
  if (!fullName || !businessName || !address || !phone || !email || !serviceRequest) {
    return res.status(400).json({ ok: false, error: "All fields are required." });
  }

  try {
    dbOps.saveServiceApplication(req.body);
    console.log("🧾 New service application from:", fullName);
    res.json({ ok: true, message: "Application submitted successfully!" });
  } catch (err) {
    console.error("❌ Application DB error:", err);
    res.status(500).json({ ok: false, error: "Failed to save application." });
  }
});

// View Database (Data Retrieval)
app.get("/api/service-applications", (req, res) => {
  try {
    const data = dbOps.getServiceApplications();
    res.json(data);
  } catch (err) {
    console.error("Error reading applications:", err);
    res.status(500).json({ error: "Could not read applications" });
  }
});

app.get("/api/messages", (req, res) => {
  try {
    const data = dbOps.getMessages();
    res.json(data);
  } catch (err) {
    console.error("Error reading messages:", err);
    res.status(500).json({ error: "Could not read messages" });
  }
});

app.post("/api/roxanne-chat", async (req, res) => {
  const userMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!userMessage) {
    return res.status(400).json({ ok: false, error: "Message is required." });
  }

  const config = getRoxanneConfig();
  const safeHistory = sanitizeRoxanneMessages(req.body?.messages);
  const messageHistory = [
    { role: "system", content: config.systemPrompt },
    ...safeHistory,
    { role: "user", content: userMessage.slice(0, 4000) },
  ];

  const isDefaultRemoteConfig = !process.env.ROXANNE_API_URL && !config.key;
  if (isDefaultRemoteConfig) {
    return res.json({
      ok: true,
      configured: false,
      reply: "Roxanne chat is installed and ready, but the live API credentials have not been configured on the server yet. Add ROXANNE_API_KEY and, if needed, ROXANNE_API_URL to enable live responses.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const apiResponse = await fetch(config.url, {
      method: "POST",
      headers: getRoxanneHeaders(config),
      body: JSON.stringify(buildRoxannePayload(config, messageHistory)),
      signal: controller.signal,
    });

    const rawText = await apiResponse.text();
    let payload = null;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }

    if (!apiResponse.ok) {
      const upstreamError =
        payload?.error?.message ||
        payload?.message ||
        rawText ||
        "Roxanne API request failed.";
      throw new Error(upstreamError);
    }

    const reply = extractRoxanneReply(payload);
    if (!reply) {
      throw new Error("The AI endpoint returned no readable reply.");
    }

    res.json({ ok: true, configured: true, reply });
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "The Roxanne AI request timed out."
      : (error?.message || "Roxanne chat failed.");

    console.error("Roxanne chat error:", message);
    res.status(502).json({ ok: false, error: message });
  } finally {
    clearTimeout(timeout);
  }
});

app.get("/api/articles/:slug/stats", validateArticleSlug, (req, res) => {
  res.json(buildArticleStats(req.articleSlug));
});

app.get("/api/articles/:slug/discussion", validateArticleSlug, (req, res) => {
  res.json(buildArticleDiscussion(req.articleSlug, req.clientIp));
});

app.post("/api/articles/:slug/comments", validateArticleSlug, (req, res) => {
  const payload = validateArticleCommentInput(req.body);
  if (payload.error) {
    return res.status(400).json({ ok: false, error: payload.error });
  }

  dbOps.createArticleComment(req.articleSlug, payload.name, payload.email, payload.message, req.clientIp);
  res.status(201).json(buildArticleDiscussion(req.articleSlug, req.clientIp));
});

app.put("/api/articles/:slug/comments/:commentId", validateArticleSlug, (req, res) => {
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid comment id." });
  }

  const existing = dbOps.getArticleCommentById(req.articleSlug, commentId);
  if (!existing) {
    return res.status(404).json({ ok: false, error: "Comment not found." });
  }

  if (existing.ipAddress !== req.clientIp) {
    return res.status(403).json({ ok: false, error: "Only the original IP can edit this comment." });
  }

  const payload = validateArticleCommentInput(req.body);
  if (payload.error) {
    return res.status(400).json({ ok: false, error: payload.error });
  }

  dbOps.updateArticleComment(req.articleSlug, commentId, payload.name, payload.email, payload.message);
  res.json(buildArticleDiscussion(req.articleSlug, req.clientIp));
});

app.delete("/api/articles/:slug/comments/:commentId", validateArticleSlug, (req, res) => {
  const commentId = Number(req.params.commentId);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ ok: false, error: "Invalid comment id." });
  }

  const existing = dbOps.getArticleCommentById(req.articleSlug, commentId);
  if (!existing) {
    return res.status(404).json({ ok: false, error: "Comment not found." });
  }

  if (existing.ipAddress !== req.clientIp) {
    return res.status(403).json({ ok: false, error: "Only the original IP can delete this comment." });
  }

  dbOps.deleteArticleComment(req.articleSlug, commentId);
  res.json(buildArticleDiscussion(req.articleSlug, req.clientIp));
});

app.post("/api/articles/:slug/reactions", validateArticleSlug, (req, res) => {
  const reaction = typeof req.body?.reaction === "string" ? req.body.reaction.trim().toLowerCase() : "";
  if (reaction !== "up" && reaction !== "down") {
    return res.status(400).json({ ok: false, error: "A valid reaction is required." });
  }

  dbOps.setArticleReaction(req.articleSlug, req.clientIp, reaction);
  res.json(buildArticleDiscussion(req.articleSlug, req.clientIp));
});

app.post("/api/articles/:slug/shares", validateArticleSlug, (req, res) => {
  const network = typeof req.body?.network === "string" ? req.body.network.trim().toLowerCase() : "";
  if (!SHARE_NETWORKS.has(network)) {
    return res.status(400).json({ ok: false, error: "Unsupported share target." });
  }

  dbOps.trackArticleShare(req.articleSlug, req.clientIp, network);
  res.json(buildArticleDiscussion(req.articleSlug, req.clientIp));
});

// === 404 HANDLER ===
app.use((req, res) => {
  const viewPath = path.join(__dirname, "views", "404.ejs");
  if (fs.existsSync(viewPath)) {
    res.status(404).render("404");
  } else {
    res.status(404).send("404 - Page not found");
  }
});

// === START SERVER ===
const PORT = process.env.PORT || 8787;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
