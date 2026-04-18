import sqlite3 from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.join(__dirname, "website_data.sqlite");

// Ensure database file exists
if (!fs.existsSync(dbPath)) {
  console.log("📁 Creating new SQLite database at:", dbPath);
  fs.writeFileSync(dbPath, "");
}

// Initialize database
let db;
try {
  db = new sqlite3(dbPath);
  console.log(`✅ Connected to SQLite database at ${dbPath}`);
} catch (err) {
  console.error("❌ Failed to connect to SQLite DB:", err.message);
  process.exit(1);
}

// Create tables if missing
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS service_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT,
    businessName TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    serviceRequest TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    email TEXT,
    position TEXT,
    resume_path TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("✅ Tables verified/created successfully.");

// Export helpers
export const dbOps = {
  // Contact messages
  saveMessage: (name, email, message) => {
    return db.prepare("INSERT INTO messages (name, email, message) VALUES (?, ?, ?)").run(name, email, message);
  },
  getMessages: () => {
    return db.prepare("SELECT * FROM messages ORDER BY id DESC").all();
  },

  // Service applications
  saveServiceApplication: (data) => {
    const { fullName, businessName, address, phone, email, serviceRequest } = data;
    return db.prepare(
      "INSERT INTO service_applications (fullName, businessName, address, phone, email, serviceRequest) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(fullName, businessName, address, phone, email, serviceRequest);
  },
  getServiceApplications: () => {
    return db.prepare("SELECT * FROM service_applications ORDER BY id DESC").all();
  },

  // Job applications
  saveJobApplication: (full_name, email, position, resume_path = null) => {
    return db.prepare(
      "INSERT INTO applications (full_name, email, position, resume_path) VALUES (?, ?, ?, ?)"
    ).run(full_name, email, position, resume_path);
  },
  getJobApplications: () => {
    return db.prepare("SELECT * FROM applications ORDER BY id DESC").all();
  }
};

export default db;
