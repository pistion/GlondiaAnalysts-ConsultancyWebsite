// view-db.js
import { dbOps } from "./db.js";

console.log("\n=== SERVICE APPLICATIONS ===");
console.table(dbOps.getServiceApplications());

console.log("\n=== JOB APPLICATIONS ===");
console.table(dbOps.getJobApplications());

console.log("\n=== CONTACT MESSAGES ===");
console.table(dbOps.getMessages());
