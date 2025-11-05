import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import sqlite3 from "better-sqlite3";

// === Fix __dirname for ES Modules ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// === Determine Database Path ===
const dbPath =
  process.env.NODE_ENV === "production"
    ? "/mnt/volume/website_data.sqlite"
    : path.join(__dirname, "website_data.sqlite");

// === Ensure database file exists ===
if (!fs.existsSync(dbPath)) {
  console.log("Creating new SQLite database at:", dbPath);
  fs.writeFileSync(dbPath, "");
}

// === Initialize Database Connection ===
let db;
try {
  db = new sqlite3(dbPath);
  console.log(`✅ Connected to SQLite database at ${dbPath}`);
} catch (err) {
  console.error("❌ Failed to connect to SQLite DB:", err.message);
  process.exit(1);
}

// === Create Tables if Missing ===
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      message TEXT,
      submitted_at TEXT
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS service_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT,
      businessName TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      serviceRequest TEXT,
      submitted_at TEXT
    )
  `).run();

  console.log("✅ Tables verified/created successfully.");
} catch (err) {
  console.error("❌ Failed to create tables:", err);
}

// === Serve Static Files ===
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.static(path.join(__dirname, "../public/html")));

// === Redirect .html URLs to clean versions ===
app.get(/^\/(.+)\.html$/, (req, res) => {
  const cleanUrl = req.path.replace(/\.html$/, "");
  res.redirect(301, cleanUrl);
});

// === Serve clean URLs as if they were .html files ===
app.get("/:page", (req, res, next) => {
  const filePath = path.join(__dirname, `../public/${req.params.page}.html`);
  res.sendFile(filePath, (err) => {
    if (err) next();
  });
});

// === HOME PAGE ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/Home.html"));
});

// === HEALTH CHECK ROUTE ===
app.get("/health", (req, res) => {
  res.send("OK");
});

// === CONTACT FORM API ===
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }

  try {
    db.prepare(
      "INSERT INTO messages (name, email, message, submitted_at) VALUES (?, ?, ?, datetime('now'))"
    ).run(name, email, message);
    res.json({ ok: true, message: "Message received successfully!" });
  } catch (err) {
    console.error("Contact DB error:", err);
    res.status(500).json({ ok: false, error: "Failed to save message." });
  }
});

// === APPLY FORM API ===
app.post("/api/apply", (req, res) => {
  const { fullName, businessName, address, phone, email, serviceRequest } = req.body;
  if (!fullName || !businessName || !address || !phone || !email || !serviceRequest) {
    return res.status(400).json({ ok: false, error: "All fields are required." });
  }

  try {
    db.prepare(
      "INSERT INTO service_applications (fullName, businessName, address, phone, email, serviceRequest, submitted_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
    ).run(fullName, businessName, address, phone, email, serviceRequest);
    res.json({ ok: true, message: "Application submitted successfully!" });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ ok: false, error: "Failed to save application." });
  }
});

// === VIEW DATABASE APIs ===
app.get("/api/service-applications", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM service_applications ORDER BY id DESC").all();
    res.json(data);
  } catch (err) {
    console.error("Error reading database:", err);
    res.status(500).json({ error: "Could not read database" });
  }
});

app.get("/api/messages", (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM messages ORDER BY id DESC").all();
    res.json(data);
  } catch (err) {
    console.error("Error reading messages table:", err);
    res.status(500).json({ error: "Could not read messages table" });
  }
});

// === 404 HANDLER ===
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "../public/404.html"));
});

// === START SERVER ===
const PORT = process.env.PORT || 8787;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
