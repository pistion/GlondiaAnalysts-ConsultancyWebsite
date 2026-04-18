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
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());

// === Serve Static Files ===
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// === Redirect .html URLs to clean versions ===
app.get(/^\/(.+)\.html$/, (req, res) => {
  const cleanUrl = req.path.replace(/\.html$/, "");
  res.redirect(301, cleanUrl);
});

// === INDEX PAGE ===
app.get("/", (req, res) => {
  res.render("index");
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
