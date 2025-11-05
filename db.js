// db.js
import Database from "better-sqlite3";

const db = new Database("website_data.sqlite");

// --- Create tables if not exist ---

// New table for service applications
db.exec(`
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
`);

// Existing job applications table
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT,
    email TEXT,
    position TEXT,
    resume_path TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Existing contact messages table
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- Export database operations ---
export default {
  // Original job application saver
  saveApplication(full_name, email, position, resume_path = null) {
    db.prepare(
      "INSERT INTO applications (full_name, email, position, resume_path) VALUES (?, ?, ?, ?)"
    ).run(full_name, email, position, resume_path);
  },

  // New service application saver
  saveServiceApplication({ fullName, businessName, address, phone, email, serviceRequest }) {
    db.prepare(
      "INSERT INTO service_applications (fullName, businessName, address, phone, email, serviceRequest) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(fullName, businessName, address, phone, email, serviceRequest);
  },

  // Original message saver
  saveMessage(name, email, message) {
    db.prepare(
      "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)"
    ).run(name, email, message);
  },
};
