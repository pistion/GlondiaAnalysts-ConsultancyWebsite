// view-db.js
import Database from "better-sqlite3";

const db = new Database("website_data.sqlite");

console.log("\n=== SERVICE APPLICATIONS ===");
console.table(db.prepare("SELECT * FROM service_applications").all());

console.log("\n=== JOB APPLICATIONS ===");
console.table(db.prepare("SELECT * FROM applications").all());

console.log("\n=== CONTACT MESSAGES ===");
console.table(db.prepare("SELECT * FROM messages").all());
